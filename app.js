// Constants
var BUILDING_HEIGHT_SCALE = 0.00001;
var COORDINATE_SCALE = 0.00001;

// Scene setup
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit controls
var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Lighting
var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Ground plane
var groundGeometry = new THREE.PlaneGeometry(1, 1);
var groundMaterial = new THREE.MeshBasicMaterial({ color: 0x999999 });
var groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
groundPlane.rotation.x = -Math.PI / 2;
scene.add(groundPlane);

// Helper axis
var axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Fetch OpenStreetMap data
function fetchOsmData(minLat, minLon, maxLat, maxLon, callback) {
    var query = `
    [out:json];
    (
      way["building"]
        (${minLat},${minLon},${maxLat},${maxLon});
    );
    out geom;
    `;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://overpass-api.de/api/interpreter', true);
    xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var osmData = JSON.parse(xhr.responseText);
            callback(osmData);
        }
    };
    xhr.send(query);
}

// Process OSM data and create buildings
function createBuildings(osmData) {
    var buildings = new THREE.Group();
    
    osmData.elements.forEach(function(element) {
        if (element.type === 'way' && element.tags.building) {
            var shape = new THREE.Shape();
            var firstNode = element.geometry[0];
            
            shape.moveTo(
                (firstNode.lon - osmData.bounds.minlon) * COORDINATE_SCALE,
                (firstNode.lat - osmData.bounds.minlat) * COORDINATE_SCALE
            );
            
            element.geometry.slice(1).forEach(function(node) {
                shape.lineTo(
                    (node.lon - osmData.bounds.minlon) * COORDINATE_SCALE,
                    (node.lat - osmData.bounds.minlat) * COORDINATE_SCALE
                );
            });
            
            var extrudeSettings = {
                depth: (element.tags.height || 10) * BUILDING_HEIGHT_SCALE,
                bevelEnabled: false
            };
            
            var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            var material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
            var building = new THREE.Mesh(geometry, material);
            
            buildings.add(building);
        }
    });
    
    scene.add(buildings);
}

// Main function to initialize the scene
function init() {
    var minLat = 40.7128;
    var minLon = -74.0060;
    var maxLat = 40.7138;
    var maxLon = -74.0050;
    
    fetchOsmData(minLat, minLon, maxLat, maxLon, function(osmData) {
        createBuildings(osmData);
        
        // Set camera position
        var centerLat = (minLat + maxLat) / 2;
        var centerLon = (minLon + maxLon) / 2;
        camera.position.set(
            (centerLon - minLon) * COORDINATE_SCALE,
            0.001,
            (centerLat - minLat) * COORDINATE_SCALE
        );
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        
        // Adjust ground plane size
        var width = (maxLon - minLon) * COORDINATE_SCALE;
        var height = (maxLat - minLat) * COORDINATE_SCALE;
        groundPlane.scale.set(width, height, 1);
        groundPlane.position.set(width / 2, 0, height / 2);
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
    });
}

// Handle window resizing
window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize the scene
init();
