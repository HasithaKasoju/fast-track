var map = L.map('map').setView([20.5937, 78.9629], 5);
var apiKey = '66636952555dd952043342boa8d19e2';

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var markers = [];
var markerInfo = [];
var routingControl;

map.on('click', function(e) {
    addMarker(e.latlng.lat, e.latlng.lng);
});

document.getElementById('add-address-button').addEventListener('click', function() {
    var address = document.getElementById('address-input').value;
    if (address) {
        geocodeAddress(address);
    }
});

function addMarker(lat, lng, address = '') {
    var marker = L.marker([lat, lng]).addTo(map);

    if (!address) {
        var url = `https://geocode.maps.co/reverse?lat=${lat}&lon=${lng}&api_key=${apiKey}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.address) {
                    address = data.address.state_district || data.address.village || data.address.city || data.address.state_district || data.address.county || data.address.state_district || data.address.state || data.address.county || data.address.county_code;
                    if (!address) address = 'Address not found';
                } else {
                    address = 'Address not found';
                }
                if (address === 'Address not found') {
                    map.removeLayer(marker);
                } else {
                    markers.push(marker);
                    addToList(marker, address);
                }
            })
            .catch(error => {
                console.error("Error fetching address:", error);
                map.removeLayer(marker);
            });
    } else {
        markers.push(marker);
        addToList(marker, address);
    }
}

function addToList(marker, address) {
    markerInfo.push({ marker: marker, address: address });

    var listItem = document.createElement('li');
    listItem.textContent = address;

    var deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = function() {
        map.removeLayer(marker);
        var index = markerInfo.findIndex(info => info.marker === marker);
        if (index !== -1) {
            markerInfo.splice(index, 1);
            markers.splice(index, 1);
        }
        listItem.remove();
        document.getElementById('tsp-button').style.display = markers.length > 1 ? 'block' : 'none';
    };

    listItem.appendChild(deleteButton);
    document.getElementById('point-list').appendChild(listItem);

    document.getElementById('tsp-button').style.display = markers.length > 1 ? 'block' : 'none';
}

function geocodeAddress(address) {
    var url = `https://geocode.maps.co/search?q=${encodeURIComponent(address)}&api_key=${apiKey}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                var location = data[0];
                addMarker(location.lat, location.lon, address);
            } else {
                alert("No results found for the address.");
            }
        })
        .catch(error => console.error('Geocoder failed due to:', error));
}

document.getElementById('finish-button').addEventListener('click', function() {
    if (markers.length < 2) {
        alert("Please add at least two markers to create a route.");
        return;
    }

    if (routingControl) {
        map.removeControl(routingControl);
    }

    var waypoints = markers.map(function(marker) {
        return marker.getLatLng();
    });

    routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true,
        geocoder: L.Control.Geocoder.nominatim(),
        lineOptions: {
            styles: [{ color: "#FF0000", opacity: 0.7, weight: 2 }]
        }
    }).addTo(map);

    // Display the optimized route
    var optimizedWaypoints = calculateTSPRoute(markers);
    displayOptimizedRoute(optimizedWaypoints);
});

document.getElementById('tsp-button').addEventListener('click', function() {
    if (markers.length < 2) {
        alert("Please add at least two markers to create a route.");
        return;
    }

    if (routingControl) {
        map.removeControl(routingControl);
    }

    var waypoints = calculateTSPRoute(markers);

    routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true,
        geocoder: L.Control.Geocoder.nominatim(),
        lineOptions: {
            styles: [{ color: "blue", opacity: 0.7, weight: 2 }]
        }
    }).addTo(map);
    scrollToMap();

    // No need to display the optimized route list here
});

function calculateTSPRoute(markers) {
    var remainingMarkers = markers.slice();
    var waypoints = [];

    var currentMarker = remainingMarkers.shift();
    waypoints.push(currentMarker.getLatLng());

    while (remainingMarkers.length > 0) {
        var nearestIndex = findNearestMarkerIndex(currentMarker, remainingMarkers);
        var nearestMarker = remainingMarkers[nearestIndex];
        waypoints.push(nearestMarker.getLatLng());
        currentMarker = remainingMarkers.splice(nearestIndex, 1)[0];
    }

    return waypoints;
}

function findNearestMarkerIndex(marker, markers) {
    var minDistance = Number.MAX_VALUE;
    var nearestIndex = -1;

    for (var i = 0; i < markers.length; i++) {
        var distance = marker.getLatLng().distanceTo(markers[i].getLatLng());
        if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
        }
    }

    return nearestIndex;
}

function displayOptimizedRoute(waypoints) {
    var list = document.getElementById('optimized-route-list');
    list.innerHTML = ''; // Clear existing list items

    waypoints.forEach(function(waypoint, index) {
        var address = markerInfo.find(info => info.marker.getLatLng().equals(waypoint)).address;
        var listItem = document.createElement('li');
        listItem.textContent = `Waypoint ${index + 1}: ${address}`;
        list.appendChild(listItem);
    });
}

document.getElementById('reset-button').addEventListener('click', resetApplication);

function resetApplication() {
    if (routingControl) {
        map.removeControl(routingControl);
    }
    markers.forEach(function(marker) {
        map.removeLayer(marker);
    });
    markers = [];
    markerInfo = [];
    document.getElementById('point-list').innerHTML = '';
    document.getElementById('optimized-route-list').innerHTML = '';
    document.getElementById('tsp-button').style.display = 'none';
}

function scrollToMap() {
    var mapContainer = document.getElementById('map-container');
    mapContainer.scrollIntoView({ behavior: 'smooth' });
}

