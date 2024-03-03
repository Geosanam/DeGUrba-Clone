# DeGUrba-Clone

Degree of Urbanization (DEGURBA) is a harmonized approach implemented by UN-Habitat and the European Commission for classifying the entire territory of nation along an urban-rural continuum. While there are toolkits developed for performing the work, this repository tries to do so using Google Earth Engine (GEE), geopandas and QGIS. 

The workflow consists of following:
i. Dividing a nation into 1 sq.km grids.
ii. Finding out the building density in each grid using building footprints data.
iii. Disaggregating the population of each population unit into the overlaying grids using building density as a factor. This is done using QGIS and geopandas.
iv. The population grid obtained from above operation is obtained as shapefile and converted into raster.
v. The raster thus obtained is imported in GEE.
vi. The population grid raster is divided into the groups of urban centres, urban clusters and rural grid cells.
vii. Various conditions are applied for the division process: for the urban centres, the groups should have population of at least 50000 formed by grids having population greater than or equal to 1500 and so on for the urban cluster and rural grids.
viii. Finally, the population units are classified into three classes: cities, towns and rural areas.
ix. For classification of the unit into city, 50% of its population should reside in urban centre group, and so on for towns and rural areas
