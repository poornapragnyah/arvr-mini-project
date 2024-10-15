import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const BUILDING_HEIGHT_SCALE = 0.00001;
const COORDINATE_SCALE = 0.00001;

const App = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.screenSpacePanning = false;
        controls.maxPolarAngle = Math.PI / 2;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 0);
        scene.add(directionalLight);

        const groundGeometry = new THREE.PlaneGeometry(1, 1);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x999999 });
        const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        groundPlane.rotation.x = -Math.PI / 2;
        scene.add(groundPlane);

        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        const fetchOsmData = async (minLat, minLon, maxLat, maxLon) => {
            console.log(`Fetching OSM data for bounds: ${minLat}, ${minLon}, ${maxLat}, ${maxLon}`);
            const query = `
            [out:json];
            (
              way["building"]
                (${minLat},${minLon},${maxLat},${maxLon});
            );
            out geom;
            `;
            try {
                const response = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: query
                });
                const data = await response.json();
                console.log("OSM data fetched successfully:", data);
                return data;
            } catch (error) {
                console.error("Error fetching OSM data:", error);
                return null; // Return null to indicate a failure
            }
        };

        const createBuildings = (osmData) => {
            if (!osmData || !osmData.elements || osmData.elements.length === 0) {
                console.error("No OSM data to process or no elements found.");
                return;
            }

            console.log("Processing OSM data:", osmData);
            const buildings = new THREE.Group();

            osmData.elements.forEach(element => {
                if (element.type === 'way' && element.tags && element.tags.building) {
                    console.log(`Creating building for element ID: ${element.id}`);
                    const shape = new THREE.Shape();
                    const [firstNode] = element.geometry;

                    shape.moveTo(
                        (firstNode.lon - osmData.bounds.minLon) * COORDINATE_SCALE,
                        (firstNode.lat - osmData.bounds.minLat) * COORDINATE_SCALE
                    );

                    element.geometry.slice(1).forEach(node => {
                        shape.lineTo(
                            (node.lon - osmData.bounds.minlon) * COORDINATE_SCALE,
                            (node.lat - osmData.bounds.minlat) * COORDINATE_SCALE
                        );
                    });

                    const height = (element.tags.height || 10) * BUILDING_HEIGHT_SCALE;
                    console.log(`Building height for element ID ${element.id}: ${height}`);

                    const extrudeSettings = {
                        depth: height,
                        bevelEnabled: false
                    };

                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    const material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
                    const building = new THREE.Mesh(geometry, material);

                    buildings.add(building);
                } else {
                    console.warn(`Ignoring element ID ${element.id}: Not a building or not a way.`);
                }
            });

            console.log(`Total buildings created: ${buildings.children.length}`);
            scene.add(buildings);
        };

        const init = async () => {
            const minLat = 40.7128;
            const minLon = -74.0060;
            const maxLat = 40.7138;
            const maxLon = -74.0050;

            const osmData = await fetchOsmData(minLat, minLon, maxLat, maxLon);
            createBuildings(osmData);

            if (!osmData || !osmData.bounds) {
                console.error("Initialization failed: Invalid OSM data.");
                return; // Exit early if there's no valid data
            }

            const centerLat = (minLat + maxLat) / 2;
            const centerLon = (minLon + maxLon) / 2;
            camera.position.set(
                (centerLon - minLon) * COORDINATE_SCALE,
                0.001,
                (centerLat - minLat) * COORDINATE_SCALE
            );
            camera.lookAt(new THREE.Vector3(0, 0, 0));

            const width = (maxLon - minLon) * COORDINATE_SCALE;
            const height = (maxLat - minLat) * COORDINATE_SCALE;
            groundPlane.scale.set(width, height, 1);
            groundPlane.position.set(width / 2, 0, height / 2);

            const animate = () => {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();
        };

        init();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            console.log("Window resized. Camera aspect updated.");
        };
        window.addEventListener('resize', handleResize);

        return () => {
            mountRef.current.removeChild(renderer.domElement);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            console.log("Renderer disposed and event listeners removed.");
        };
    }, []);

    return <div ref={mountRef} />;
};

export default App;
