[out:json][timeout:60][bbox:{{bbox}}];
(
  way["highway"];
  way["building"];
  way["natural"="water"];
  way["waterway"];
  way["leisure"="park"];
  way["landuse"~"^(forest|grass|recreation_ground)$"];
);
out body geom qt;
