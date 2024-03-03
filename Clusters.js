var popGridImg = popGridImg_Nepal
var aoi = ktm_district.geometry()
// Map.addLayer(aoi, {color: 'gray'}, 'Selected Region');
Map.centerObject(aoi, 7);

// var stats = popGridImg.reduceRegion({
//   reducer:ee.Reducer.sum()
// })
// print(stats)


///////////// Degree of Urbanization ///////////

// I have a population grid image on which each grid of 1 sq. km. contains
// the population per sq. km. 

// Visualizing the population Grid Image
var palette = ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8',
              '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'];

var visParams = {
  min: 0, 
  max: 1000, 
  palette: palette
};
// Map.addLayer(popGridImg_Nepal,visParams,'Population Nepal',false)
Map.addLayer(popGridImg,visParams,'Population Density', false);
// print(popGridImg)
  


////////////////////// URBAN CENTRE CLASSIFICATION ///////////////

//First one is, a grid should have population higher than 1500
var perGridThreshold = 1500

// Second one is, the cluster obtained by applying the first condition should have 
// population >= 50000
var perClusterThreshold = 50000

// Applying first condition,
var centreCell = popGridImg.gt(perGridThreshold).selfMask()
// Map.addLayer(urbanCell,{palette:['yellow']},'urban cells',false)

// Creating cluster of urban cells,
var kernel_plus = ee.Kernel.plus(1)
var centreCluster = centreCell.connectedComponents({connectedness:kernel_plus,maxSize:1000})
// Map.addLayer(cluster.select('labels').randomVisualizer(),null,'initial cluster',false)
// print(cluster,'cluster')



var popGridCentre = popGridImg.addBands(centreCluster.select('labels'))  // This added additional band to popGridImg
// Map.addLayer(popGridImg2.select('b1'),visParams,'population density 2')
// print(popGridImg2, 'population grid later')


var reducedGridCentre = popGridCentre.reduceConnectedComponents({
  reducer:ee.Reducer.sum(),  // sum of population in each cluster
  labelBand:'labels',
  maxSize:1000
}).addBands(popGridCentre.select('labels'))

// ReduceConnectedComponents() works well with reproject() method 
// Search for reduceConnectedComponents() in user guide for referral
reducedGridCentre = reducedGridCentre.reproject({
  crs: popGridImg.projection(),
  scale:1000
})

Map.addLayer(reducedGridCentre.select('b1'),{min:10000,max:50000,palette:['yellow','red']},'reduced Grid Centre',false)

var centreMask = reducedGridCentre.select('b1').gte(50000).selfMask()
// Map.addLayer(centreMask,{palette:['purple']},'urbanCentre mask')

var urbanCentre = reducedGridCentre.updateMask(centreMask)
// Map.addLayer(urbanCentre.randomVisualizer(),null,'urban centre')



////////////////// GAP FILLING ////////////////////
var kernelNeighs = ee.Kernel.fixed({
  width:3,height:3,weights:[[1,1,1],[1,0,1],[1,1,1]]
})
print(kernelNeighs,'kernel for neighbor')

var holeCriteria = centreMask.unmask(0).reduceNeighborhood({
  reducer:ee.Reducer.sum(),kernel:kernelNeighs
  }).gte(5).selfMask().rename('holes')
// The hole criteria sets pixels within the urban centre also as holes 
// So we ignore the pixels within the centre by unmasking later
  


holeCriteria = holeCriteria.reproject({
  crs: popGridImg.projection(),
  scale:1000
})
// Map.addLayer(holeCriteria,{},'hole criteria',false)

var holesinCentre = urbanCentre.unmask(holeCriteria)
// Map.addLayer(holesinCentre.randomVisualizer(),null,'holes in urban centre',false)



var gapFilledCentre = holesinCentre.where({
  test:holesinCentre.eq(1),  // only hole pixels
  value:holesinCentre.reduceNeighborhood({reducer:ee.Reducer.mode(),kernel:kernelNeighs,skipMasked:true})
})

gapFilledCentre = gapFilledCentre.reproject({
  crs:popGridImg.projection(),
  scale:1000
})
// Map.addLayer(gapFilledCentre.select('labels'),{palette:['purple']},'gap filled center')


////////////////// URBAN CLUSTER CLASSIFICATION ///////////////

// //First one is, a grid should have population higher than 1500
// var perGridThreshold = 1500

// // Second one is, the cluster obtained by applying the first condition should have 
// // population >= 50000
// var perClusterThreshold = 50000

// Applying first condition,
var clusterCell = popGridImg.gt(300).selfMask()
// Map.addLayer(urbanCell,{palette:['yellow']},'urban cells',false)

// Creating cluster of urban cells,
var kernel_square = ee.Kernel.square(1)
var cluster = clusterCell.connectedComponents({connectedness:kernel_square,maxSize:1000})
// Map.addLayer(cluster.randomVisualizer(),null,'initial cluster',false)
// print(cluster,'cluster')



var popGridCluster = popGridImg.addBands(cluster.select('labels'))  // This added additional band to popGridImg
// Map.addLayer(popGridImg2.select('b1'),visParams,'population density cluster')



var reducedGridCluster = popGridCluster.reduceConnectedComponents({
  reducer:ee.Reducer.sum(),  // sum of population in each cluster
  labelBand:'labels',
  maxSize:1000
}).addBands(popGridCluster.select('labels'))

// ReduceConnectedComponents() works well with reproject() method 
// Search for reduceConnectedComponents() in user guide for referral
reducedGridCluster = reducedGridCluster.reproject({
  crs: popGridImg.projection(),
  scale:1000
})

// Map.addLayer(reducedGrid.select('b1'),{min:10000,max:50000,palette:['yellow','red']},'reduced Grid',false)

var clusterMask = reducedGridCluster.select('b1').gte(5000).selfMask()
// Map.addLayer(clusterMask,{palette:['#FFFFED']},'urbanCluster mask')

var clusterMaskArea = clusterMask.multiply(ee.Image.pixelArea()).reduceRegion({
  reducer:ee.Reducer.sum(),
  scale:1000
})
print(clusterMaskArea,'cluster mask area')

var orderedBands = ['labels','b1']
var urbanCluster = reducedGridCluster.updateMask(clusterMask)
Map.addLayer(urbanCluster.randomVisualizer(),null,'whole urban cluster') //This also includes the urban centre
var wholeClusterVector = urbanCluster.select(orderedBands).reduceToVectors({
  reducer:ee.Reducer.first(),
  scale:1000,
  eightConnected:true,
  labelProperty:'label'
})
print(wholeClusterVector,'whole cluster vector')
print(wholeClusterVector.aggregate_sum('first'),'whole cluster vector pop')
Map.addLayer(wholeClusterVector,{color:'yellow'},'whole cluster vector')



// // We will exclude the urban centre as:
var onlyCluster = urbanCluster.select('labels').where(gapFilledCentre.select('labels'),0).neq(0).selfMask()
var urbanCluster2 = reducedGridCluster.updateMask(onlyCluster)
Map.addLayer(urbanCluster2.select('b1'),{palette:'red'},'urban cluster')

Map.addLayer(gapFilledCentre.select('b1'),{palette:['purple']},'gap filled urban center')

// var onlyCluster = urbanCluster.select('labels').where(gapFilledCentre.select('labels'),0)
// Map.addLayer(onlyCluster.neq(0),{},'only cluster')


/////////////////////// RURAL GRID CLASSIFICATION //////////////////////
var clusternCenter = gapFilledCentre.select('labels').unmask(0).or(onlyCluster.unmask(0))
// Map.addLayer(clusternCenter,{},'cluster and center',false)
// print(clusternCenter,'cluster and center')

var ruralGrid = popGridImg.unmask(0).where({
  test:clusternCenter.not(),
  value:1
}).eq(1).selfMask()
// print(ruralGrid,'rural grid')
// Map.addLayer(ruralGrid,{palette:['#90EE90']},'rural grid')

var ruralGridPop = popGridImg.unmask(0).updateMask(ruralGrid)
// Map.addLayer(ruralGridPop,visParams, 'rural grid pop')

var ruralCluster = ruralGrid.connectedComponents({connectedness:kernel_square,maxSize:1000})
// Map.addLayer(cluster.randomVisualizer(),null,'initial cluster',false)
// print(cluster,'cluster')



var popGridRural = popGridImg.addBands(ruralCluster.select('labels'))  // This added additional band to popGridImg
// Map.addLayer(popGridImg2.select('b1'),visParams,'population density cluster')



var reducedGridRural = popGridRural.reduceConnectedComponents({
  reducer:ee.Reducer.sum(),  // sum of population in each cluster
  labelBand:'labels',
  maxSize:1000
}).addBands(popGridRural.select('labels'))

// ReduceConnectedComponents() works well with reproject() method 
// Search for reduceConnectedComponents() in user guide for referral
reducedGridRural = reducedGridRural.reproject({
  crs: popGridImg.projection(),
  scale:1000
})
Map.addLayer(reducedGridRural.select('b1'),{palette:['#90EE90']},'rural grid cluster')
// Map.addLayer(ktm_district)
// Map.addLayer(Ktm_pop)

print(gapFilledCentre,'gap filled centre')
print(urbanCluster2,'urban cluster')
print(reducedGridRural,'rural')

var orderedBands = ['labels','b1']
var centreVector = gapFilledCentre.select(orderedBands).reduceToVectors({
  reducer:ee.Reducer.first(),
  scale:1000,
  eightConnected:false,
  labelProperty:'label'
})
// .set({'Population':gapFilledCentre.get('b1')})
 
print(centreVector.aggregate_sum('first'),'centre vector population') 
// Map.addLayer(centreVector,{color:'purple'},'vector centre')


var clusterVector = urbanCluster2.select(orderedBands).reduceToVectors({
  reducer:ee.Reducer.first(),
  scale:1000,
  eightConnected:true,
  labelProperty:'label'
}).set({'Cluster area':clusterMaskArea.get('b1')})
// .set({'Population':gapFilledCentre.get('b1')})
 
print(clusterVector.aggregate_sum('first'),'cluster vector population') 
// Map.addLayer(clusterVector,{color:'red'},'vector cluster')

var ruralVector = reducedGridRural.select(orderedBands).reduceToVectors({
  reducer:ee.Reducer.first(),
  scale:1000,
  eightConnected:true,
  labelProperty:'label'
})
// .set({'Population':gapFilledCentre.get('b1')})
 
print(ruralVector.aggregate_sum('first'),'rural vector population') 
Map.addLayer(ruralVector,{color:'90EE90'},'vector rural')
Map.addLayer(clusterVector,{color:'red'},'vector cluster')
Map.addLayer(centreVector,{color:'purple'},'vector centre')

// var merged = ruralVector.merge(clusterVector)
// print(merged,'merged')
// Map.addLayer(merged,{},'merged')


// Export.table.toDrive({
//   collection:clusterVector,
//   description:'UrbanClusters_Nepal',
//   folder:'GEE/Degurba Nepal',
//   fileFormat:'SHP'
// })

// Export.table.toDrive({
//   collection:ruralVector,
//   description:'Rural_Nepal',
//   folder:'GEE/Degurba Nepal',
//   fileFormat:'SHP'
// })
  
// Export.table.toDrive({
//   collection:centreVector,
//   description:'UrbanCentres_Nepal',
//   folder:'GEE/Degurba Nepal',
//   fileFormat:'SHP'
// })
