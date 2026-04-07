"use strict";
// Imports des librariries Three.js pour la visualisation 3D
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from "/static/js/three/FontLoader.js";
import { TextGeometry } from "/static/js/three/TextGeometry.js";

// ============================================
// VARIABLES GLOBALES - Caméra et rendu
// ============================================
var camera, renderer;
var ground = true;

// Scène 3D principale
window.scene = new THREE.Scene();
var cameraControls;
var clock = new THREE.Clock();

// ============================================
// VARIABLES GLOBALES - Éléments de la serre
// ============================================
var toitMovible = null;           // Toit mobile de la serre
var beltMesh = null;              // Courroie du servo
var potPosition = { x: 100, y: 260, z: 350 };  // Position du pot
var pumpLedMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });  // LED de la pompe
var lockMaterial = null;          // Verrou visuels de la pompe
var waterFull=22;                 // Niveau d'eau maximum
var waterlevel = waterFull;       // Niveau d'eau courant
var waterMesh = null;             // Maille du réservoir d'eau
var tankBottom = 225;             // Position de base du réservoir
var waterTube = 0;                // Opacité du tube d'eau (0-1)
var innerPipeMaterial = null;     // Matériau du tube intérieur 1
var innerPipeMaterial1 = null;    // Matériau du tube intérieur 2

// ============================================
// VARIABLES GLOBALES - Gouttes d'eau
// ============================================
const DROP_COUNT = 30;            // Nombre de gouttes simulées
var dropMesh = null;              // Maille contenant les gouttes
var dropData = [];                // Données des gouttes (position, vélocité, active)
var dropOrigin = new THREE.Vector3(85, 300, 350);  // Point d'origine des gouttes
var gravity = -0.15;              // Force de gravité
var dropTimer = 0;                // Timer pour les gouttes

// ============================================
// VARIABLES GLOBALES - Capteurs
// ============================================
var temp = 0;                     // Température actuelle
var humAir = 0;                   // Humidité de l'air
var humSol = 0;                   // Humidité du sol
var lum = 0;                      // Luminosité

// ============================================
// VARIABLES GLOBALES - Particules et matrices
// ============================================
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
var splashParticles = [];         // Particules d'éclaboussure

// ============================================
// VARIABLES GLOBALES - Boîte de photos
// ============================================
var boxGroup   = null;            // Groupe contenant la boîte de photos
var tableGroup = null;            // Groupe de la table
var serreGroup = null;            // Groupe de la serre
var Buttons = [];                 // Tableau des boutons
var boxGroupTargetZ = 0;          // Position Z cible de la boîte
var boxGroupTargetX = 0;          // Position X cible de la boîte
var boxGroupTargetY = 610;        // Position Y cible de la boîte
var boxGroupTargetRotX = Math.PI/2;  // Rotation X cible
var boxGroupTargetRotY = 0;

var screenTexture = null;         // Texture de l'écran frontal
var screenMaterial = null;        // Matériau de l'écran frontal

// ============================================
// VARIABLES GLOBALES - Photos
// ============================================
var photoList = [];               // Liste des photos disponibles
var photoIndex = 0;               // Index de la photo actuelle
var screenTextureBack = null;     // Texture de l'écran arrière
var screenMaterialBack = null;    // Matériau de l'écran arrière
var photoLabelMesh = null;        // Texte du nom du fichier
var photoSerreMesh = null;        // Texte des infos de la serre


// ============================================
// FONCTION - Remplir la scène 3D
// ============================================
function fillScene() {
    // Création de la lumière directionnelle
    var light = new THREE.DirectionalLight(0xFFFFFF, 2);
    light.position.set(-1300, 700, 1240);
    window.scene.add(light);
    window.scene.background = new THREE.Color(0x87CEEB);

    // Appel de toutes les fonctions de dessin
    drawTable();
    drawWall();
    drawfloor();
    drawSerreFloor();
    drawSerreWalls();
    drawPillars();
    drawSupportToit();
    drawToit();
    drawLED();
    drawPot();
    drawPlant();
    drawPump();
    drawPipe();
    drawWaterTank();
    drawWaterDrops();
    drawLCD();
    drawServo();
    drawMovableBox();
    drawLedLights();
}

// ============================================
// FONCTION - Créer une texture de bouton
// ============================================
function makeButtonCanvas(label, pressed) {
    // Création du canvas et contexte 2D
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var ctx = c.getContext('2d');
    
    // Couleur de fond selon l'état (appuyé ou non)
    ctx.fillStyle = pressed ? '#3a5faa' : '#1a1a2e';
    ctx.beginPath(); ctx.roundRect(4, 4, 120, 120, 16); ctx.fill();
    
    // Contour du bouton
    ctx.strokeStyle = pressed ? '#ffffff' : '#7eb8ff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(4, 4, 120, 120, 16); ctx.stroke();
    
    // Texte du bouton
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 68);
    
    // Conversion en texture Three.js
    return new THREE.CanvasTexture(c);
}

// ============================================
// FONCTION - Dessiner la table
// ============================================
function drawTable() {

    tableGroup = new THREE.Group();
    window.scene.add(tableGroup);

    // Texture et matériau de la table en bois
    var Textureloader = new THREE.TextureLoader();
    var TableTexture = Textureloader.load('/static/js/texture/bois.jpg');
    var material = new THREE.MeshPhongMaterial({ map: TableTexture });

    // Surface de la table
    var table = new THREE.Mesh(new THREE.BoxGeometry(600, 30, 600), material);
    table.position.set(0, 205, 500);
    tableGroup.add(table);

    // Pieds de la table (4 positions)
    var legPositions = [[-280,40,220],[280,40,220],[-280,40,780],[280,40,780]];
    legPositions.forEach(pos => {
        var leg = new THREE.Mesh(new THREE.BoxGeometry(40, 300, 40), material);
        leg.position.set(...pos);
        tableGroup.add(leg);
    });

    var face   = 5;

    // Bouton "Photo" sur la table
    var defs = [
        { label: 'Photo', dir: 'Photo', x: 0, y: -60 }
    ];

    defs.forEach(function(def) {
        var normalTex  = makeButtonCanvas(def.label, false);
        var pressedTex = makeButtonCanvas(def.label, true);
        var mat = new THREE.MeshBasicMaterial({ map: normalTex });

        var btn = new THREE.Mesh(new THREE.BoxGeometry(100, 50, 2), mat);
        btn.position.set(def.x, def.y, face);

        btn.userData.direction  = def.dir;
        btn.userData.normalTex  = normalTex;
        btn.userData.pressedTex = pressedTex;
        btn.userData.mat        = mat;

        btn.position.set(200, 240, 450); 
        btn.rotation.x = -Math.PI / 4;

        tableGroup.add(btn);
        Buttons.push(btn);
    });
}

// ============================================
// FONCTION - Dessiner le mur de fond
// ============================================
function drawWall() {
    // Charger la texture du mur
    var Textureloader = new THREE.TextureLoader();
    var WallTexture = Textureloader.load('/static/js/texture/wall.png');
    
    // Créer le mur en arrière-plan
    var wall = new THREE.Mesh(
        new THREE.BoxGeometry(2000, 1500, 50),
        new THREE.MeshPhongMaterial({ map: WallTexture })
    );
    wall.position.set(0, 640, 150);
    window.scene.add(wall);
}

// ============================================
// FONCTION - Dessiner le sol
// ============================================
function drawfloor() {
    // Créer le sol gris
    var floor = new THREE.Mesh(
        new THREE.BoxGeometry(2000, 50, 2000),
        new THREE.MeshPhongMaterial({ color: 0x999999 })
    );
    floor.position.set(0, -135, 1125);
    window.scene.add(floor);
}

// ============================================
// FONCTION - Dessiner le sol de la serre
// ============================================
function drawSerreFloor() {
    // Créer le groupe principal de la serre
    serreGroup = new THREE.Group();
    serreGroup.position.set(-50, 0, 0);
    window.scene.add(serreGroup);
    
    // Créer le sol marron de la serre
    var floor = new THREE.Mesh(
        new THREE.BoxGeometry(380, 10, 200),
        new THREE.MeshPhongMaterial({ color: 0xB68E65 })
    );
    floor.position.set(0, 222.5, 350);
    serreGroup.add(floor);
}

// ============================================
// FONCTION - Dessiner les murs de la serre
// ============================================
function drawSerreWalls() {
    // Matériau transparent blanc pour les murs en verre
    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,            // 10% d'opacité pour voir à travers
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide   // Visible des deux côtés
    });

    // Murs avant et arrière
    var wallsPossitions = [[0, 313.5, 250], [0, 313.5, 450]];
    wallsPossitions.forEach(pos => {
        var walls = new THREE.Mesh(new THREE.BoxGeometry(380, 172, 10), material);
        walls.position.set(...pos);
        serreGroup.add(walls);
    });

    // Murs latéraux gauche et droit
    var sideWallsPositions = [[185, 313.5, 350], [-185, 313.5, 350]];
    sideWallsPositions.forEach(pos => {
        var sideWall = new THREE.Mesh(new THREE.BoxGeometry(10, 172, 200), material);
        sideWall.position.set(...pos);
        serreGroup.add(sideWall);
    });
}

// ============================================
// FONCTION - Dessiner les piliers de la serre
// ============================================
function drawPillars() {
    // Charger la texture bois pour les piliers
    var Textureloader = new THREE.TextureLoader();
    var pillarTexture = Textureloader.load('/static/js/texture/bois.jpg');
    var material = new THREE.MeshPhongMaterial({
        map: pillarTexture
    });

    // Créer 4 piliers aux coins de la serre
    var pillarPositions = [[-188, 313.5, 252], [188, 313.5, 252], [-188, 313.5, 448], [188, 313.5, 448]];
    pillarPositions.forEach(pos => {
        var pillar = new THREE.Mesh(new THREE.BoxGeometry(10, 171, 10), material);
        pillar.position.set(...pos);
        serreGroup.add(pillar);
    });
}

// ============================================
// FONCTION - Dessiner les supports du toit
// ============================================
function drawSupportToit() {
    // Matériau transparent pour les supports triangulaires
    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide
    });

    // Créer les supports triangulaires avant et arrière
    var supportToitPositions = [[0, 400, 350], [0, 400, 550]];
    supportToitPositions.forEach(pos => {
        // Créer une géométrie personnalisée (triangle)
        var geometry = new THREE.BufferGeometry();
        var vertices = new Float32Array([
            -190, 0, -100,  // Point gauche
             190, 0, -100,  // Point droit
               0, 72, -100,  // Point haut
        ]);
        var indices = [0, 1, 2];
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        var supToit = new THREE.Mesh(geometry, material);
        supToit.position.set(...pos);
        serreGroup.add(supToit);
    });
}

// ============================================
// FONCTION - Dessiner le toit mobile
// ============================================
function drawToit() {
    // Créer le matériau transparent pour le toit
    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide
    });

    // Toit fixe gauche
    var geometry = new THREE.BoxGeometry(5, 210, 200);
    var toit = new THREE.Mesh(geometry, material);
    toit.position.set(-99, 437, 350);
    toit.rotation.z = -(Math.PI / 2.6);
    serreGroup.add(toit);

    // Toit mobile droit (pivotant avec le servo)
    var geometry2 = new THREE.BoxGeometry(5, 210, 200);
    var toit2 = new THREE.Mesh(geometry2, material);
    toit2.position.set(0, -105, 0);

    // Créer l'objet pivot pour le toit mobile
    toitMovible = new THREE.Object3D();
    toitMovible.position.set(194, 397.5, 350);
    toitMovible.rotation.z = Math.PI / 2.6;
    toitMovible.add(toit2);

    serreGroup.add(toitMovible);
}

// ============================================
// FONCTION - Dessiner les LED rouges
// ============================================
function drawLED() {
    // Créer le matériau rouge pour les LED
    var material = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
    
    // Dessiner 2 LED aux positions spécifiées
    var ledPosition = [[-100, 430, 310], [-100, 430, 390]];
    ledPosition.forEach(pos => {
        var led = new THREE.Mesh(new THREE.BoxGeometry(2, 100, 15), material);
        led.position.set(...pos);
        led.rotation.z = -(Math.PI / 2.6);
        serreGroup.add(led);
    });
}

// ============================================
// FONCTION - Dessiner le pot de plante
// ============================================
function drawPot() {
    // Charger les textures du pot
    var Textureloader = new THREE.TextureLoader();
    var sideTexture = Textureloader.load('/static/js/texture/pot.jpg');
    var topTexture = Textureloader.load('/static/js/texture/dirt.jpg');
    var sideMaterial = new THREE.MeshPhongMaterial({ map: sideTexture });
    var topMaterial = new THREE.MeshPhongMaterial({ map: topTexture });
    var bottomMaterial = new THREE.MeshPhongMaterial({ color: 0x00FF00 });

    // Créer le corps cylindrique du pot (côté, haut, bas)
    var pot = new THREE.Mesh(
        new THREE.CylinderGeometry(40, 30, 70, 32),
        [sideMaterial, topMaterial, bottomMaterial]
    );
    pot.position.set(potPosition.x, potPosition.y, potPosition.z);
    serreGroup.add(pot);

    // Créer le bord du pot (un anneau sur le dessus)
    const outerRadius = 42;  
    const innerRadius = 38;  
    const height = 8;       
    const segments = 64;

    const points = [
        new THREE.Vector2(innerRadius, 0),
        new THREE.Vector2(outerRadius, 0),
        new THREE.Vector2(outerRadius, height),
        new THREE.Vector2(innerRadius, height),
        new THREE.Vector2(innerRadius, 0),
    ];

    const rimGeometry = new THREE.LatheGeometry(points, segments);
    const rimMaterial = new THREE.MeshPhongMaterial({
        map: sideTexture,
        side: THREE.DoubleSide,
    });

    var rim = new THREE.Mesh(rimGeometry, rimMaterial);
    // Positionner le bord sur le dessus du pot
    rim.position.set(potPosition.x, potPosition.y + 35, potPosition.z);

    serreGroup.add(rim);
}

// ============================================
// FONCTION - Dessiner la plante
// ============================================
function drawPlant() {
    // Charger les textures pour la plante
    var Textureloader = new THREE.TextureLoader();
    var stemTexture = Textureloader.load('/static/js/texture/stem.jpg');
    var material = new THREE.MeshPhongMaterial({ map: stemTexture });
    
    // Cr\u00e9er la tige
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 50, 32), material);
    stem.position.set(potPosition.x, potPosition.y + 50, potPosition.z);
    serreGroup.add(stem);

    // Cr\u00e9er la fleur (sph\u00e8re jaune au sommet)
    var material = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
    var flower = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 32), material);
    flower.position.set(potPosition.x, potPosition.y + 73.5, potPosition.z);
    serreGroup.add(flower);

    // Créer les pétales roses
    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(-12, 8, -10, 32, 0, 40);
    petalShape.bezierCurveTo(10, 32, 12, 8, 0, 0);
    const petalGeometry = new THREE.ShapeGeometry(petalShape, 32);
    const petalMaterial = new THREE.MeshPhongMaterial({
       color: 0xff66aa,
       side: THREE.DoubleSide,
    });

    // Générer 15 pétales arrangés en cercle
    const petalCount = 15;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;

        // Créer un pivot pour chaque pétale
        const pivot = new THREE.Object3D();
        pivot.position.set(potPosition.x, potPosition.y + 75, potPosition.z);
        pivot.rotation.y = angle; // Rotation radiale

        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.set(0, -3.5, 0); // Positionner le pétale
        petal.rotation.x = -(Math.PI / 2 - 0.4); // Incliner le pétale

        pivot.add(petal);
        serreGroup.add(pivot);
    }

    // Créer les feuilles en bas
    var leafTexture = Textureloader.load('/static/js/texture/Leaves.jpg');
    var leafMaterial = new THREE.MeshPhongMaterial({ map: leafTexture, transparent: true });
    var bottomLeafsLocation = [
        { x: potPosition.x - 8, y: potPosition.y + 43, z: potPosition.z, rotationz: -(Math.PI/1.2) },
        { x: potPosition.x + 8, y: potPosition.y + 43, z: potPosition.z, rotationz: Math.PI/1.2}
    ];
    bottomLeafsLocation.forEach(pos => {
        var leaf = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0005, 0.01, 20, 32),
            leafMaterial
        );
        leaf.position.set(pos.x, pos.y, pos.z);
        leaf.rotation.z = pos.rotationz;
        leaf.scale.set(500, 1, 1);
        serreGroup.add(leaf);
    });

    // Créer les feuilles en haut
    var topLeafsLocation = [
        { x: potPosition.x - 18, y: potPosition.y + 60, z: potPosition.z, rotationz: -(Math.PI/1.2)+Math.PI },
        { x: potPosition.x + 18, y: potPosition.y + 60, z: potPosition.z, rotationz: Math.PI/1.2+Math.PI }
    ];
    topLeafsLocation.forEach(pos => {
        var leaf = new THREE.Mesh(
            new THREE.CylinderGeometry(0, 0.01, 20, 32),
            new THREE.MeshPhongMaterial({ map : leafTexture, transparent: true})
        );
        leaf.position.set(pos.x, pos.y, pos.z);
        leaf.rotation.z = pos.rotationz;
        leaf.scale.set(500, 1, 1);
        serreGroup.add(leaf);
    });
}

function drawPump() {
    // Matériau noir pour la pompe
    var material = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100, specular: 0x888888 });
    
    // Créer le corps principal de la pompe (cylindre)
    var pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 20, 32), material);
    pumpBody.position.set(55, 237, 420);
    serreGroup.add(pumpBody);

    // Création de l'entrée d'eau
    var pumpEntry = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 10, 32), material);
    pumpEntry.position.set(65, 242, 420);
    pumpEntry.rotation.z = Math.PI / 2; 
    serreGroup.add(pumpEntry);   
    
    // Création de la sortie d'eau
    var pumpExit = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 10, 32), material);
    pumpExit.position.set(45, 232, 420);
    pumpExit.rotation.z = Math.PI / 2; 
    serreGroup.add(pumpExit);

    // Création de la LED de la pompe (cylindre rouge)
    var pumpLed = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 32), pumpLedMaterial);
    pumpLed.position.set(55, 245, 420);
    serreGroup.add(pumpLed);

    // Sommet de la LED (sphère rouge)
    var pumpLEDTop = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), pumpLedMaterial);
    pumpLEDTop.position.set(55, 250, 420);
    serreGroup.add(pumpLEDTop);

    // Création du verrou visuel de la pompe
    var Textureloader = new THREE.TextureLoader();
    var lockTexture = Textureloader.load('/static/js/texture/lock.png');
    lockMaterial = new THREE.MeshBasicMaterial({ map: lockTexture, transparent: true, opacity: 0 });
    var lock = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 0.1), lockMaterial);
    lock.position.set(50, 242, 437);
    serreGroup.add(lock);
}

// ============================================
// FONCTION - Dessiner les tuyaux d'eau
// ============================================
function drawPipe() {
    // Créer la courbe du premier tuyau
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(50, 232, 420),
        new THREE.Vector3(0, 232, 420),
        new THREE.Vector3(0, 242, 350),
        new THREE.Vector3(50, 305, 350),
        new THREE.Vector3(85, 300, 350),
    ]);

    // Créer la géométrie du tuyau externe (noir transparent)
    var geometry = new THREE.TubeGeometry(curve,20,3,8,false);
    var material = new THREE.MeshPhongMaterial({         
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        shininess: 100,
        specular: 0x888888,
        side: THREE.DoubleSide, 
        depthWrite: false
    });
    var pipe = new THREE.Mesh(geometry, material);
    pipe.frustumCulled = false;  
    serreGroup.add(pipe);

    // Créer la géométrie du tuyau intérieur (bleu pour l'eau)
    var innerGeometry = new THREE.TubeGeometry(curve,20,1.5,8,false);
    innerPipeMaterial = new THREE.MeshPhongMaterial({
        color: 0x0000FF,
        transparent: true,
        opacity: waterTube,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
    });
    var innerPipe = new THREE.Mesh(innerGeometry, innerPipeMaterial);
    innerPipe.frustumCulled = false;  
    serreGroup.add(innerPipe);

    // Créer la courbe du second tuyau
    var curve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(60, 242, 420),
        new THREE.Vector3(100, 245, 420),
        new THREE.Vector3(150, 267, 420),
        new THREE.Vector3(160, 262, 420),
        new THREE.Vector3(162, 240, 420),
    ]);

    // Créer la géométrie du second tuyau externe
    var geometry1 = new THREE.TubeGeometry(curve1,50,3,8,false);
    var material1 = new THREE.MeshPhongMaterial({         
        color: 0x000000,
        transparent: true,
        opacity: 0.3,
        shininess: 100,
        specular: 0x888888,
        side: THREE.DoubleSide,
        depthWrite: false  
    });
    var pipe1 = new THREE.Mesh(geometry1, material1);
    pipe1.frustumCulled = false; 
    serreGroup.add(pipe1);

    // Créer la géométrie du second tuyau intérieur
    var innerGeometry1 = new THREE.TubeGeometry(curve1,50,1.5,8,false);
    innerPipeMaterial1 = new THREE.MeshPhongMaterial({
        color: 0x0000FF,
        transparent: true,
        opacity: waterTube,
        polygonOffset: true,       
        polygonOffsetFactor: -1,   
        polygonOffsetUnits: -1,    
    });
    var innerPipe1 = new THREE.Mesh(innerGeometry1, innerPipeMaterial1);
    innerPipe1.frustumCulled = false;  
    serreGroup.add(innerPipe1);
}

// ============================================
// FONCTION - Dessiner le réservoir d'eau
// ============================================
function drawWaterTank() {
    // Créer le réservoir externe (boîte blanche transparente)
    var material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5, depthWrite: false });
    var tank = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), material);
    tank.position.set(162, 240, 420);
    tank.frustumCulled = false;
    serreGroup.add(tank);

    // Créer le niveau d'eau intérieur (boîte bleue)
    var material = new THREE.MeshPhongMaterial({ 
        color: 0x0000FF, 
        transparent: true, 
        opacity: 0.5, 
        depthWrite: false 
    });
    waterMesh = new THREE.Mesh(new THREE.BoxGeometry(30, waterlevel, 32), material);
    waterMesh.position.set(162, tankBottom + waterlevel / 2, 420);
    waterMesh.frustumCulled = false;
    serreGroup.add(waterMesh);
}

// ============================================
// FONCTION - Initialiser les gouttes d'eau
// ============================================
function drawWaterDrops() {
    // Créer la géométrie d'une goutte (petite sphère)
    const geometry = new THREE.SphereGeometry(1, 8, 8);

    // Créer le matériau bleu translucide pour les gouttes
    const material = new THREE.MeshPhongMaterial({
        color: 0x4aa3ff,
        transparent: true,
        opacity: 0.9
    });

    // Créer une maille instanciée pour 30 gouttes
    dropMesh = new THREE.InstancedMesh(geometry, material, DROP_COUNT);
    serreGroup.add(dropMesh);

    // Initialiser les données de chaque goutte
    for (let i = 0; i < DROP_COUNT; i++) {

        dropData.push({
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            active: false
        });

        tempMatrix.identity();
        dropMesh.setMatrixAt(i, tempMatrix);
    }

    dropMesh.instanceMatrix.needsUpdate = true;
}

// ============================================
// FONCTION - Créer une éclaboussure d'eau
// ============================================
function createSplash(position) {
    // Créer la géométrie des particules d'éclaboussure
    const geo = new THREE.SphereGeometry(0.6, 6, 6);
    const mat = new THREE.MeshPhongMaterial({ color: 0x4aa3ff });

    // Générer 5 particules pour cette éclaboussure
    for (let i = 0; i < 5; i++) {

        let p = new THREE.Mesh(geo, mat);

        // Positionner la particule au point d'impact
        p.position.copy(position);

        // Donner une vélocité aléatoire à chaque particule
        p.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.4,
            (Math.random() - 0.5) * 0.5
        );

        // Durée de vie de la particule
        p.userData.life = 0.4;

        // Ajouter la particule à la scène
        window.scene.add(p);
        splashParticles.push(p);
    }
}

// ============================================
// FONCTION - Dessiner l'écran LCD
// ============================================
function drawLCD(){
    // Créer un canvas pour dessiner le contenu LCD
    var lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 356;
    lcdCanvas.height = 64;
    var lcdCtx = lcdCanvas.getContext('2d');
    
    // Remplir le fond en vert comme un vrai LCD
    lcdCtx.fillStyle = '#006400';
    lcdCtx.fillRect(0, 0, 356, 64);
    
    // Dessiner le texte noir des capteurs
    lcdCtx.fillStyle = '#000000';
    lcdCtx.font = 'bold 20px monospace';
    lcdCtx.fillText('Temp: ' + temp + '°C', 10, 25);
    lcdCtx.fillText('Hum sol: ' + humSol, 10, 50);
    lcdCtx.fillText('Lum: ' + lum + 'Lux', 170, 25);
    lcdCtx.fillText('Hum air: ' + humAir + '%', 170, 50);
    
    // Convertir le canvas en texture Three.js
    var lcdTexture = new THREE.CanvasTexture(lcdCanvas);

    // Créer le matériau pour l'écran LCD
    var material = new THREE.MeshPhongMaterial({
        map: lcdTexture,
        transparent: true,
        opacity: 0.9,
        shininess: 100,
        side: THREE.DoubleSide
    });

    // Créer la maille de l'écran LCD
    var lcdScreen = new THREE.Mesh(
        new THREE.BoxGeometry(120, 20, 10),
        material
    );
    lcdScreen.position.set(-80, 360, 455);
    serreGroup.add(lcdScreen); 

    // Créer le panneau arrière de l'écran (vert)
    var lcdBack = new THREE.Mesh(
        new THREE.BoxGeometry(135, 35, 5),
        new THREE.MeshPhongMaterial({ color: 0x006600 })
    );
    lcdBack.position.set(-80, 360, 450);
    serreGroup.add(lcdBack);

    // Fonction pour mettre à jour le texte LCD
    window.setLCDText = function() {
        lcdCtx.fillStyle = '#006400';
        lcdCtx.fillRect(0, 0, 356, 64);
        lcdCtx.fillStyle = '#000000';
        lcdCtx.font = 'bold 20px monospace';
        lcdCtx.fillText('Temp: ' + temp.toFixed(1) + 'C', 10, 25);
        lcdCtx.fillText('Hum sol: ' + humSol, 10, 50);
        lcdCtx.fillText('Lum: ' + lum + 'Lux', 170, 25);
        lcdCtx.fillText('Hum air: ' + humAir.toFixed(1) + '%', 170, 50);
        lcdTexture.needsUpdate = true;
    };

}

// ============================================
// FONCTION - Dessiner le servo moteur
// ============================================
function drawServo(){
    // Créer le corps du servo (boîte grise)
    var servo = new THREE.Mesh(new THREE.BoxGeometry(20, 40, 20), new THREE.MeshPhongMaterial({ color: 0x333333 }));
    servo.position.set(70, 420, 450);
    servo.rotation.z = Math.PI/2.6;
    serreGroup.add(servo);

    // Créer l'axe du servo (cylindre gris)
    var axe = new THREE.Mesh(new THREE.CylinderGeometry(2,2,15,24), new THREE.MeshPhongMaterial({color: 0x8E8E8E}));
    axe.position.set(80, 420, 435);
    axe.rotation.x = Math.PI/2;
    serreGroup.add(axe);

    // Créer la forme de la courroie (anneau + cercle)
    var shape = new THREE.Shape();

    var r1 = 10, cx1 = -65, cy1 = 0;
    var r2 = 15, cx2 = 0,    cy2 = 0;

    shape.moveTo(cx1, cy1 + r1);
    shape.lineTo(cx2, cy2 + r2);

    shape.absarc(cx2, cy2, r2, Math.PI / 2, -Math.PI / 2, true);

    shape.lineTo(cx1, cy1 - r1);

    shape.absarc(cx1, cy1, r1, -Math.PI / 2, Math.PI / 2, true);

    // Créer la géométrie extrudée de la courroie
    var geometry = new THREE.ExtrudeGeometry(shape,{depth:5, bevelEnabled: false});
    var material = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide});
    beltMesh = new THREE.Mesh(geometry, material);
    beltMesh.position.set(80, 420, 430);
    beltMesh.rotation.z = -(Math.PI*1.3);
    serreGroup.add(beltMesh);    

}

// ============================================
// FONCTION - Dessiner la boîte de photos (carrousel)
// ============================================
function drawMovableBox() {
    // Créer le groupe principal de la boîte
    boxGroup = new THREE.Group();
    boxGroup.position.set(0, 610, 0);
    boxGroup.rotation.x = Math.PI/2;
    window.scene.add(boxGroup);

    // Paramètres de la boîte
    var btnSize = 14;
    var gap     = 170;
    var faceZ   = 3.5;

    // Créer la maille principale de la boîte (marron)
    var box = new THREE.Mesh(
        new THREE.BoxGeometry(200, 160, 5),
        new THREE.MeshPhongMaterial({ color: 0x8B4513, shininess: 80, specular: 0x553311 })
    );
    boxGroup.add(box);

    // Charger et afficher la première photo sur l'écran frontal
    screenTexture = new THREE.TextureLoader().load('/media/camera/photo_latest.jpg');
    screenMaterial = new THREE.MeshPhongMaterial({ map: screenTexture });
    var frontScreen = new THREE.Mesh(
        new THREE.BoxGeometry(150, 112.5, 1),
        screenMaterial
    );

    frontScreen.position.set(0, 10, faceZ);
    frontScreen.rotation.y = Math.PI;
    boxGroup.add(frontScreen);
    
    // Gérer les labels de photo via TextGeometry
    var fontLoader = new FontLoader();
    fontLoader.load('/static/fonts/helvetiker_regular.typeface.json', function(font) {
        // Fonction pour créer un label texte
        function makeLabel(text, size, color, yPos) {
            const geo = new TextGeometry(text, {
                font: font,
                size: size,
                curveSegments: 12,
                height: 1,
            });
            geo.center();
            const mat = new THREE.MeshBasicMaterial({ color: color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(0, yPos, faceZ);
            return mesh;
        }

        // Créer les labels initiaux vides
        photoLabelMesh = makeLabel('', 4, 0x000000, 72);
        boxGroup.add(photoLabelMesh);

        photoSerreMesh = makeLabel('', 3, 0xff6600, -60);
        boxGroup.add(photoSerreMesh);

        // Fonction pour mettre à jour le nom du fichier
        window.setPhotoLabel = function(path) {
            const filename = path.split('/').pop() || 'NO NAME';
            if (photoLabelMesh) {
                boxGroup.remove(photoLabelMesh);
                photoLabelMesh.geometry.dispose();
            }
            photoLabelMesh = makeLabel(filename, 4, 0x000000, 72);
            boxGroup.add(photoLabelMesh);
        };

        // Fonction pour mettre à jour les infos de la serre
        window.setSerreLabel = function(serre) {
            var text = serre ? 'humSol: '+ serre.sol + '  temp: ' + serre.temp + '°C  humAir: ' + serre.hum + '  lum: ' + serre.lumiere + '  ' + serre.periode + '  servo: ' + serre.servo + '°  LED: ' + serre.led + '  eau: ' + serre.eau + 'ml': '';
            if (photoSerreMesh) {
                boxGroup.remove(photoSerreMesh);
                photoSerreMesh.geometry.dispose();
            }
            photoSerreMesh = makeLabel(text, 3, 0x000000, -52);
            boxGroup.add(photoSerreMesh);
        };
    });


    // Créer les boutons de navigation
    var navDefs = [
        { label: '←', dir: 'left',  x: -gap / 2, y: 0 },
        { label: '→', dir: 'right', x:  gap / 2, y: 0 },
        { label: 'last', dir: 'last', x: 0, y: -68 },
        { label: 'close', dir: 'close', x: 85, y: 60}
    ];

    // Ajouter les boutons à la boîte
    navDefs.forEach(function(def) {
        var normalTex  = makeButtonCanvas(def.label, false);
        var pressedTex = makeButtonCanvas(def.label, true);
        var mat = new THREE.MeshBasicMaterial({ map: normalTex });
        var btn = new THREE.Mesh(new THREE.BoxGeometry(btnSize, btnSize, 2), mat);
        btn.position.set(def.x, def.y, faceZ);
        btn.userData.direction  = def.dir;
        btn.userData.normalTex  = normalTex;
        btn.userData.pressedTex = pressedTex;
        btn.userData.mat        = mat;
        boxGroup.add(btn);
        Buttons.push(btn);
    });


    // Créer l'écran arrière avec la même photo
    screenTextureBack = new THREE.TextureLoader().load('/media/camera/photo_latest.jpg');
    screenMaterialBack = new THREE.MeshPhongMaterial({ map: screenTextureBack });
    var screen = new THREE.Mesh(new THREE.BoxGeometry(150, 112.5, 1), screenMaterialBack);
    screen.position.set(0, 10, -faceZ);
    boxGroup.add(screen);

    // Créer le bouton "scroll" (retourner la boîte)
    var normalTexB  = makeButtonCanvas('scroll', false);
    var pressedTexB = makeButtonCanvas('scroll', true);
    var matB = new THREE.MeshBasicMaterial({ map: normalTexB });
    var btnBack = new THREE.Mesh(new THREE.BoxGeometry(btnSize, btnSize, 2), matB);
    btnBack.position.set(40, -60, -faceZ);
    btnBack.rotation.y = Math.PI;
    btnBack.userData.direction  = 'scroll';
    btnBack.userData.normalTex  = normalTexB;
    btnBack.userData.pressedTex = pressedTexB;
    btnBack.userData.mat        = matB;
    boxGroup.add(btnBack);
    Buttons.push(btnBack);

    // Créer le bouton "reload" (recharger la photo)
    var normalTexR  = makeButtonCanvas('reload', false);
    var pressedTexR = makeButtonCanvas('reload', true);
    var matR = new THREE.MeshBasicMaterial({ map: normalTexR });
    var btnReload = new THREE.Mesh(new THREE.BoxGeometry(btnSize, btnSize, 2), matR);
    btnReload.position.set(-40, -60, -faceZ);
    btnReload.rotation.y = Math.PI;
    btnReload.userData.direction  = 'reload';
    btnReload.userData.normalTex  = normalTexR;
    btnReload.userData.pressedTex = pressedTexR;
    btnReload.userData.mat        = matR;
    boxGroup.add(btnReload);
    Buttons.push(btnReload);


    // Créer le bouton "close" (fermer la boîte)
    var normalTexC  = makeButtonCanvas('close', false);
    var pressedTexC = makeButtonCanvas('close', true);
    var matC = new THREE.MeshBasicMaterial({ map: normalTexC });
    var btnClose = new THREE.Mesh(new THREE.BoxGeometry(btnSize, btnSize, 2), matC);
    btnClose.position.set(-85, 60, -faceZ);
    btnClose.rotation.y = Math.PI;
    btnClose.userData.direction  = 'close';
    btnClose.userData.normalTex  = normalTexC;
    btnClose.userData.pressedTex = pressedTexC;
    btnClose.userData.mat        = matC;
    boxGroup.add(btnClose);
    Buttons.push(btnClose);
}

var boxRaycaster = new THREE.Raycaster();   
var boxMouse     = new THREE.Vector2();

// ============================================
// FONCTION - Charger une photo par index
// ============================================
function loadPhotoAtIndex(i) {
    console.log("🔥 FUNCTION CALLED 🔥");
    
    // Vérifier si la liste de photos existe
    if (!photoList || photoList.length === 0) return;

    // Calculer l'index circulaire (boucle sur la liste)
    photoIndex = ((i % photoList.length) + photoList.length) % photoList.length;

    var photo = photoList[photoIndex];

    console.log("INDEX:", photoIndex);
    console.log("PHOTO:", photo);

    // Extraire le chemin de la photo
    let path = null;
    if (typeof photo === "string") path = photo;
    else if (photo.image) path = photo.image;
    else if (photo.path) path = photo.path;

    console.log("PATH:", path);

    // Mettre à jour les labels d'informations
    if (window.setPhotoLabel) {
        window.setPhotoLabel(path);
    }

    if (window.setSerreLabel && photo.serre) {
        window.setSerreLabel(photo.serre);
    }

    if (!path) {
        console.error("Invalid photo object:", photo);
        return;
    }

    // Charger la texture de la photo avec cache-buster
    var url = window.location.origin + path + '?t=' + Date.now();
    console.log("URL:", url);

    var old = screenTexture;

    // Charger la texture via TextureLoader
    new THREE.TextureLoader().load(
        url,
        function(newTexture) {
            console.log("TEXTURE LOADED ✅");

            // Appliquer la nouvelle texture à l'écran
            screenMaterial.map = newTexture;
            screenMaterial.needsUpdate = true;

            screenTexture = newTexture;
        },
        undefined,
        function(err) {
            console.error("TEXTURE FAILED ❌", url, err);
        }
    );
}


// ============================================
// FONCTION - Initialiser les clics sur les boutons
// ============================================
function initBoxClicks() {
    // Écouter les événements de pointer sur le canvas
    renderer.domElement.addEventListener('pointerdown', function(e) {
        // Calculer la position de la souris normalisée pour le raycaster
        var rect    = renderer.domElement.getBoundingClientRect();
        boxMouse.x  = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
        boxMouse.y  = ((e.clientY - rect.top)  / rect.height) * -2 + 1;

        // Lancer un rayon de la caméra à travers la souris
        boxRaycaster.setFromCamera(boxMouse, camera);
        var hits = boxRaycaster.intersectObjects(Buttons);

        if (hits.length > 0) {
            var btn = hits[0].object;
            var dir = btn.userData.direction;

            // Retour visuel : appuyer sur le bouton
            btn.userData.mat.map = btn.userData.pressedTex;
            btn.userData.mat.needsUpdate = true;
            btn.scale.setScalar(0.88);

            // Restaurer l'aspect normal après 180ms
            setTimeout(function() {
                btn.userData.mat.map = btn.userData.normalTex;
                btn.userData.mat.needsUpdate = true;
                btn.scale.setScalar(1.0);
            }, 180);

            // Gestion du bouton "Photo" - afficher/masquer la boîte de photos
            if (dir === 'Photo') {
                var isOut = boxGroupTargetZ === 0;  // true = actuellement caché, en train de s'afficher
                boxGroupTargetX    = isOut ?  0    : 0;
                boxGroupTargetY    = isOut ?  610  : 610;
                boxGroupTargetZ    = isOut ?  430  : 0;
                camera.position.x = 0;
                camera.position.y = 0;
                camera.position.z = 600;
                cameraControls.target.set(0, 510, 0);
                cameraControls.enablePan = false;
                cameraControls.enableRotate = false;
                cameraControls.enableZoom = false;
                if (isOut) {
                    boxGroupTargetRotX = 0;
                } else {
                    boxGroupTargetRotX = Math.PI / 2;
                }
            }

            // Gestion du bouton "last" - retourner la boîte
            if (dir === 'last') {
                boxGroupTargetRotY += Math.PI;
            }

            // Gestion du bouton "scroll" - retourner à la face avant
            if (dir === 'scroll') {
                boxGroupTargetRotY += Math.PI;
            }

            // Gestion du bouton "close" - fermer la boîte de photos
            if (dir ==='close'){
                boxGroupTargetX    = isOut ?  0    : 0;
                boxGroupTargetY    = isOut ?  610  : 610;
                boxGroupTargetZ    = isOut ?  430  : 0;

                camera.position.set(0, 500, 1500);
                cameraControls.target.set(0, 43, -8);

                // Réactiver les contrôles de caméra
                cameraControls.enablePan = false;
                cameraControls.enableRotate = true;
                cameraControls.enableZoom = true;
                cameraControls.maxPolarAngle = Math.PI / 2.3;
                cameraControls.minPolarAngle = Math.PI / 4;
                cameraControls.minAzimuthAngle = -0.2;
                cameraControls.maxAzimuthAngle = 0.2;
                cameraControls.minDistance = 500;
                cameraControls.maxDistance = 2000;
            }

            // Gestion du bouton "reload" - recharger la dernière photo
            if (dir === 'reload') {
                var old = screenTexture;
                new THREE.TextureLoader().load(
                    '/media/camera/photo_latest.jpg?t=' + Date.now(),
                    function(newTexture) {
                        screenMaterial.map = newTexture;
                        screenMaterial.needsUpdate = true;
                        old.dispose();
                        screenTexture = newTexture;
                    }
                );
            }

            // Gestion du bouton "left" - charger la photo suivante
            if (dir === 'left') {
                console.log("LEFT CLICK");
                loadPhotoAtIndex(photoIndex + 1);
            }

            // Gestion du bouton "right" - charger la photo précédente
            if (dir === 'right') {
                console.log("RIGHT CLICK");
                loadPhotoAtIndex(photoIndex - 1);
            }
        }
    });
}

// ============================================
// FONCTION - Initialiser le rendu 3D
// ============================================
function init() {
    // Obtenir les dimensions du conteneur
    var container = document.querySelector('.container');
    var canvasWidth = container.offsetWidth;

    // Hauteur dynamique selon la taille de l'écran
    var canvasHeight = window.innerHeight * 0.9; // 90% de la hauteur
    if (window.innerWidth < 768) {
        canvasHeight = window.innerHeight * 0.45; // Plus petit sur mobile
    }

    var canvasRatio = canvasWidth / canvasHeight;

    // Créer le rendu WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColor(0x999999, 1.0);

    // Configurer la caméra perspective
    camera = new THREE.PerspectiveCamera(30, canvasRatio, 1, 10000);
    cameraControls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 500, 1500);
    cameraControls.target.set(0, 43, -8);

    // Limiter les contrôles de caméra
    cameraControls.enablePan = false;
    cameraControls.maxPolarAngle = Math.PI / 2.3;
    cameraControls.minPolarAngle = Math.PI / 4;
    cameraControls.minAzimuthAngle = -0.2;
    cameraControls.maxAzimuthAngle = 0.2;
    cameraControls.minDistance = 500;
    cameraControls.maxDistance = 2000;
}


// ============================================
// FONCTION - Ajouter le rendu au DOM
// ============================================
function addToDOM() {
    // Obtenir le conteneur HTML
    var container = document.getElementById('webGL');
    var canvas = container.getElementsByTagName('canvas');
    
    // Supprimer le canvas existant s'il existe
    if (canvas.length > 0) {
        container.removeChild(canvas[0]);
    }
    
    // Ajouter le canvas du rendu au DOM
    container.appendChild(renderer.domElement);
}

// ============================================
// FONCTION - Boucle d'animation
// ============================================
function animate() {
    // Demander la prochaine frame d'animation
    window.requestAnimationFrame(animate);
    render();
}

// ============================================
// FONCTION - Dessiner les lumières LED
// ============================================
function drawLedLights() {
    // Créer les lumières spot LED aux positions spécifiées
    ledLightPosition.forEach(pos => {
        // Créer une lumière spot rouge
        var light = new THREE.SpotLight(0xFF0000, 0);
        light.position.set(pos.x, pos.y, pos.z);
        light.distance = 400;
        light.angle = Math.PI / 15;
        light.penumbra = 0.2;

        // Créer l'objet cible de la lumière (vers la plante)
        var ledTarget = new THREE.Object3D();
        ledTarget.position.set(potPosition.x, potPosition.y + 70, potPosition.z);
        serreGroup.add(ledTarget);
        light.target = ledTarget;

        // Ajouter la lumière à la scène
        serreGroup.add(light);
        ledLights.push(light);
    });

}

// ============================================
// FONCTIONS GLOBALES - Vendre les propriétés
// ============================================

// Variables globals pour la rotation du toit
var toitTargetAngle = -1.95;

// Définir l'angle du servo (rotation du toit)
window.setToitAngle = function(servoAngle) {
    toitTargetAngle = servoAngle >= 180 ? -2.2 : -1.95;
};

// Tableau des lumières LED
var ledLights = [];

// Position des lumières LED
var ledLightPosition = [
    { x: -100, y: 430, z: 310 },
    { x: -100, y: 430, z: 390 }
];

// Mettre à jour l'intensité des lumières LED
window.setLedIntensity = function(ledState) {
    var intensity = (ledState === 'ON') ? 250000 : 0;
    ledLights.forEach(function(l) { l.intensity = intensity; });
};

// Mettre à jour l'état de la pompe (couleur et opacité du tube)
window.setPompeState = function(pompeState) {
    pumpLedMaterial.color.set(pompeState === 'ON' ? 0x00ff00 : 0xff0000);
    if (pompeState === 'ON') {  
        waterTube = 0.8;  // Montrer le tube d'eau
    } else {
        waterTube = 0;    // Cacher le tube d'eau
    }
};

// Mettre à jour l'état du verrou de la pompe
window.setPompeLock = function(lockTime) {
    if (lockMaterial) {
        if (lockTime == 0 || lockTime == 600) {
            lockMaterial.opacity = 0;    // Cacher
        } else {
            lockMaterial.opacity = 1;    // Montrer
        }
    }
};

// Mettre à jour la température affichée
window.setTemp = function(newTemp) {    
    temp = newTemp;
    if (window.setLCDText) window.setLCDText();
};

// Mettre à jour l'humidité de l'air affichée
window.setHumAir = function(newHumAir) {
    humAir = newHumAir;
    if (window.setLCDText) window.setLCDText();
};

// Mettre à jour l'humidité du sol affichée
window.setHumSol = function(newHumSol) {
    humSol = newHumSol;
    if (window.setLCDText) window.setLCDText();
};

// Mettre à jour la luminosité affichée
window.setLumiere = function(newLumiere) {
    lum = newLumiere;
    if (window.setLCDText) window.setLCDText();
};

// Mettre à jour le niveau d'eau du réservoir
window.setEauStock = function(eauStock) {
    waterlevel = (eauStock/100)*waterFull;
};


// ============================================
// FONCTION - Rendu de chaque frame
// ============================================
function render() {
    // Obtenir le delta temporel depuis la dernière frame
    var delta = clock.getDelta();
    
    // Mettre à jour les contrôles de caméra
    cameraControls.update(delta);

    // Animer le toit mobile de la serre
    if (toitMovible) {
        toitMovible.rotation.z += (toitTargetAngle - toitMovible.rotation.z) * 0.05;
        if (beltMesh) {
            beltMesh.rotation.z += (toitTargetAngle - toitMovible.rotation.z) * 0.15;
        }
    }

    // Animer la boîte de photos vers sa position cible
    if (boxGroup) {
        var speed = 0.02;
        boxGroup.position.x   += (boxGroupTargetX    - boxGroup.position.x)   * speed;
        boxGroup.position.y   += (boxGroupTargetY    - boxGroup.position.y)   * speed;
        boxGroup.position.z   += (boxGroupTargetZ    - boxGroup.position.z)   * speed;
        boxGroup.rotation.x   += (boxGroupTargetRotX - boxGroup.rotation.x)   * speed;
        boxGroup.rotation.y   += (boxGroupTargetRotY - boxGroup.rotation.y)   * (speed*10);
    }

    // Mettre à jour le niveau d'eau du réservoir
    if (waterMesh) {
        waterMesh.scale.y = waterlevel / 20;
        waterMesh.position.y = tankBottom + waterlevel / 2;
    }

    // Mettre à jour l'opacité des tubes d'eau
    if (innerPipeMaterial) {
        innerPipeMaterial.opacity = waterTube;
    }

    if (innerPipeMaterial1) {
        innerPipeMaterial1.opacity = waterTube;
    }

    // Mettre à jour le timer des gouttes
    dropTimer += delta;

    // Simuler les gouttes d'eau
    for (let i = 0; i < DROP_COUNT; i++) {

        const drop = dropData[i];

        // Simuler les gouttes seulement si la pompe est active
        if (waterTube > 0) {

            // Créer une nouvelle goutte si suffisamment de temps s'est écoulé
            if (!drop.active && dropTimer > 0.05) {

                drop.active = true;
                drop.position.copy(dropOrigin);

                drop.velocity.set(
                    (Math.random() - 0.5) * 0.2,
                    -2,
                    (Math.random() - 0.5) * 0.2
                );

                dropTimer = 0;
            }

            // Mettre à jour la position de la goutte
            if (drop.active) {

                drop.velocity.y += gravity;
                drop.position.add(drop.velocity);

                // Vérifier si la goutte a touché le  pot
                if (drop.position.y < potPosition.y + 40) {

                    createSplash(drop.position);
                    drop.active = false;

                }

            }

        } else {

            drop.active = false;

        }

        // Mettre à jour la matrice de la goutte
        if (drop.active) {
            tempPosition.copy(drop.position);
        } else {
            tempPosition.set(0, -1000, 0);
        }

        tempMatrix.setPosition(tempPosition);
        dropMesh.setMatrixAt(i, tempMatrix);
    }

    dropMesh.instanceMatrix.needsUpdate = true;

    // Mettre à jour les particules d'éclaboussure
    splashParticles.forEach((p, i) => {

        p.userData.velocity.y += gravity * 0.3;
        p.position.add(p.userData.velocity);

        p.userData.life -= delta;

        if (p.userData.life <= 0) {
            window.scene.remove(p);
            splashParticles.splice(i, 1);
        }

    });

    // Afficher la scène
    renderer.render(window.scene, camera);
}

try {
    init();
    fillScene();
    fetch('/api/photos/')
        .then(r => r.json())
        .then(data => {
            photoList = data.photos;
            photoIndex = 0;
            if (photoList.length > 0) {
                loadPhotoAtIndex(0);  // ← load first photo once list is ready
            }
        });
    addToDOM();
    animate();
    initBoxClicks();
} catch(e) {
    console.error("WebGL error:", e);
}