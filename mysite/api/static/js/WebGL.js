"use strict";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://unpkg.com/three@0.160.0/examples/jsm/geometries/TextGeometry.js";


var camera, renderer;
var ground = true;

window.scene = new THREE.Scene();
var cameraControls;
var clock = new THREE.Clock();
var toitMovible = null;
var beltMesh = null;
var potPosition = { x: 100, y: 260, z: 350 };
var pumpLedMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
var lockMaterial = null;
var waterFull=22;
var waterlevel = waterFull;
var waterMesh = null;
var tankBottom = 225;
var waterTube = 0;
var innerPipeMaterial = null;
var innerPipeMaterial1 = null;
const DROP_COUNT = 30;
var dropMesh = null;
var dropData = [];
var temp = 0;
var humAir = 0;
var humSol = 0;
var lum = 0;

var dropOrigin = new THREE.Vector3(85, 300, 350);
var gravity = -0.15;
var dropTimer = 0;

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();

var splashParticles = [];

var boxGroup   = null;
var tableGroup = null;
var serreGroup = null;
var Buttons = [];
var boxGroupTargetZ = 0;
var boxGroupTargetX = 0;
var boxGroupTargetY = 610;
var boxGroupTargetRotX = Math.PI/2;
var boxGroupTargetRotY = 0;

var screenTexture = null;
var screenMaterial = null;

var photoList = [];
var photoIndex = 0;
var screenTextureBack = null;
var screenMaterialBack = null;
var photoLabelMesh = null;




function fillScene() {
    var light = new THREE.DirectionalLight(0xFFFFFF, 2);
    light.position.set(-1300, 700, 1240);
    window.scene.add(light);

    // var cubeLoader = new THREE.CubeTextureLoader().setPath('assets/skybox/');
    // cubeLoader.load(
    //     ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"],
    //     function(cubeTex){ window.scene.background = cubeTex; }
    // );
    window.scene.background = new THREE.Color(0x87CEEB);

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

function makeButtonCanvas(label, pressed) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var ctx = c.getContext('2d');
    ctx.fillStyle = pressed ? '#3a5faa' : '#1a1a2e';
    ctx.beginPath(); ctx.roundRect(4, 4, 120, 120, 16); ctx.fill();
    ctx.strokeStyle = pressed ? '#ffffff' : '#7eb8ff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(4, 4, 120, 120, 16); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 68);
    return new THREE.CanvasTexture(c);
}

function drawTable() {

    tableGroup = new THREE.Group();
    window.scene.add(tableGroup);

    var Textureloader = new THREE.TextureLoader();
    var TableTexture = Textureloader.load('/static/js/texture/bois.jpg');
    var material = new THREE.MeshPhongMaterial({ map: TableTexture });

    var table = new THREE.Mesh(new THREE.BoxGeometry(600, 30, 600), material);
    table.position.set(0, 205, 500);
    // table.receiveShadow = true; // shadow_code
    tableGroup.add(table);

    var legPositions = [[-280,40,220],[280,40,220],[-280,40,780],[280,40,780]];
    legPositions.forEach(pos => {
        var leg = new THREE.Mesh(new THREE.BoxGeometry(40, 300, 40), material);
        leg.position.set(...pos);
        // leg.receiveShadow = true; // shadow_code
        tableGroup.add(leg);
    });

    var face   = 5;

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

function drawWall() {
    var Textureloader = new THREE.TextureLoader();
    var WallTexture = Textureloader.load('/static/js/texture/wall.png');
    var wall = new THREE.Mesh(
        new THREE.BoxGeometry(2000, 1500, 50),
        new THREE.MeshPhongMaterial({ map: WallTexture }) // replace with: { map: WallTexture }
    );
    wall.position.set(0, 640, 150);
    // wall.receiveShadow = true; // shadow_code
    window.scene.add(wall);
}

function drawfloor() {
    // var Textureloader = new THREE.TextureLoader();
    // var FloorTexture = Textureloader.load('./assets/Wall.png');
    var floor = new THREE.Mesh(
        new THREE.BoxGeometry(2000, 50, 2000),
        new THREE.MeshPhongMaterial({ color: 0x999999 }) // replace with: { map: FloorTexture }
    );
    floor.position.set(0, -135, 1125);
    // floor.receiveShadow = true; // shadow_code
    window.scene.add(floor);
}

function drawSerreFloor() {
    serreGroup = new THREE.Group();
    serreGroup.position.set(-50, 0, 0);
    window.scene.add(serreGroup);
    var floor = new THREE.Mesh(
        new THREE.BoxGeometry(380, 10, 200),
        new THREE.MeshPhongMaterial({ color: 0xB68E65 })
    );
    floor.position.set(0, 222.5, 350);
    // floor.receiveShadow = true; // shadow_code
    serreGroup.add(floor);
}

function drawSerreWalls() {
    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide
    });

    var wallsPossitions = [[0, 313.5, 250], [0, 313.5, 450]];
    wallsPossitions.forEach(pos => {
        var walls = new THREE.Mesh(new THREE.BoxGeometry(380, 172, 10), material);
        walls.position.set(...pos);
        serreGroup.add(walls);
    });

    var sideWallsPositions = [[185, 313.5, 350], [-185, 313.5, 350]];
    sideWallsPositions.forEach(pos => {
        var sideWall = new THREE.Mesh(new THREE.BoxGeometry(10, 172, 200), material);
        sideWall.position.set(...pos);
        serreGroup.add(sideWall);
    });
}

function drawPillars() {
    var Textureloader = new THREE.TextureLoader();
    var pillarTexture = Textureloader.load('/static/js/texture/bois.jpg');
    var material = new THREE.MeshPhongMaterial({
        map: pillarTexture
    });

    var pillarPositions = [[-188, 313.5, 252], [188, 313.5, 252], [-188, 313.5, 448], [188, 313.5, 448]];
    pillarPositions.forEach(pos => {
        var pillar = new THREE.Mesh(new THREE.BoxGeometry(10, 171, 10), material);
        pillar.position.set(...pos);
        serreGroup.add(pillar);
    });
}

function drawSupportToit() {
    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide
    });

    var supportToitPositions = [[0, 400, 350], [0, 400, 550]];
    supportToitPositions.forEach(pos => {
        var geometry = new THREE.BufferGeometry();
        var vertices = new Float32Array([
            -190, 0, -100,
             190, 0, -100,
               0, 72, -100,
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

function drawToit() {
    var material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide
    });

    var geometry = new THREE.BoxGeometry(5, 210, 200);
    var toit = new THREE.Mesh(geometry, material);
    toit.position.set(-99, 437, 350);
    toit.rotation.z = -(Math.PI / 2.6);
    serreGroup.add(toit);

    var geometry2 = new THREE.BoxGeometry(5, 210, 200);
    var toit2 = new THREE.Mesh(geometry2, material);
    toit2.position.set(0, -105, 0);

    toitMovible = new THREE.Object3D();
    toitMovible.position.set(194, 397.5, 350);
    toitMovible.rotation.z = Math.PI / 2.6;
    toitMovible.add(toit2);

    serreGroup.add(toitMovible);
}

function drawLED() {
    var material = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
    var ledPosition = [[-100, 430, 310], [-100, 430, 390]];
    ledPosition.forEach(pos => {
        var led = new THREE.Mesh(new THREE.BoxGeometry(2, 100, 15), material);
        led.position.set(...pos);
        led.rotation.z = -(Math.PI / 2.6);
        serreGroup.add(led);
    });
}

function drawPot() {
    var Textureloader = new THREE.TextureLoader();
    var sideTexture = Textureloader.load('/static/js/texture/pot.jpg');
    var topTexture = Textureloader.load('/static/js/texture/dirt.jpg');
    var sideMaterial = new THREE.MeshPhongMaterial({ map: sideTexture });
    var topMaterial = new THREE.MeshPhongMaterial({ map: topTexture });
    var bottomMaterial = new THREE.MeshPhongMaterial({ color: 0x00FF00 });

    // --- Pot body ---
    var pot = new THREE.Mesh(
        new THREE.CylinderGeometry(40, 30, 70, 32),
        [sideMaterial, topMaterial, bottomMaterial]
    );
    pot.position.set(potPosition.x, potPosition.y, potPosition.z);
    serreGroup.add(pot);

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

    // Position rim sitting on top of the pot
    // Pot height is 70, so top face is at potPosition.y + 35
    rim.position.set(potPosition.x, potPosition.y + 35, potPosition.z);

    serreGroup.add(rim);
}

function drawPlant() {
    var Textureloader = new THREE.TextureLoader();
    var stemTexture = Textureloader.load('/static/js/texture/stem.jpg');
    var material = new THREE.MeshPhongMaterial({ map: stemTexture });
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 50, 32), material);
    stem.position.set(potPosition.x, potPosition.y + 50, potPosition.z);
    // stem.castShadow = true; // shadow_code
    // stem.receiveShadow = true; // shadow_code
    serreGroup.add(stem);

    var material = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
    var flower = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 32), material);
    flower.position.set(potPosition.x, potPosition.y + 73.5, potPosition.z);
    // flower.castShadow = true; // shadow_code
    // flower.receiveShadow = true; // shadow_code
    serreGroup.add(flower);

    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(-12, 8, -10, 32, 0, 40);
    petalShape.bezierCurveTo(10, 32, 12, 8, 0, 0);

    const petalGeometry = new THREE.ShapeGeometry(petalShape, 32);
    const petalMaterial = new THREE.MeshPhongMaterial({
       color: 0xff66aa,
       side: THREE.DoubleSide,
    });

    const petalCount = 15;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;

        // Pivot sits at the center top of the stem
        const pivot = new THREE.Object3D();
        pivot.position.set(potPosition.x, potPosition.y + 75, potPosition.z);
        pivot.rotation.y = angle; // ← handles radial direction

        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.set(0, -3.5, 0); // ← push petal outward from pivot
        petal.rotation.x = -(Math.PI / 2 - 0.4); // ← tilt flat, slight upward cup

        pivot.add(petal);
        serreGroup.add(pivot);
    }

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
    var material = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 100, specular: 0x888888     });
    var pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 20, 32), material);
    pumpBody.position.set(55, 237, 420);
    serreGroup.add(pumpBody);

    var pumpEntry = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 10, 32), material);
    pumpEntry.position.set(65, 242, 420);
    pumpEntry.rotation.z = Math.PI / 2; 
    serreGroup.add(pumpEntry);   
    
    var pumpExit = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 10, 32), material);
    pumpExit.position.set(45, 232, 420);
    pumpExit.rotation.z = Math.PI / 2; 
    serreGroup.add(pumpExit);

    var pumpLed = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 32), pumpLedMaterial);
    pumpLed.position.set(55, 245, 420);
    serreGroup.add(pumpLed);

    var pumpLEDTop = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 32), pumpLedMaterial);
    pumpLEDTop.position.set(55, 250, 420);//y+5
    serreGroup.add(pumpLEDTop);

    //pump lock
    var Textureloader = new THREE.TextureLoader();
    var lockTexture = Textureloader.load('/static/js/texture/lock.png');
    lockMaterial = new THREE.MeshBasicMaterial({ map: lockTexture, transparent: true, opacity: 0 });
    var lock = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 0.1), lockMaterial);
    lock.position.set(50, 242, 437);
    serreGroup.add(lock);
}

function drawPipe() {
    var curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(50, 232, 420),
        new THREE.Vector3(0, 232, 420),
        new THREE.Vector3(0, 242, 350),
        new THREE.Vector3(50, 305, 350),
        new THREE.Vector3(85, 300, 350),
    ]);

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

    var curve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(60, 242, 420),
        new THREE.Vector3(100, 245, 420),
        new THREE.Vector3(150, 267, 420),
        new THREE.Vector3(160, 262, 420),
        new THREE.Vector3(162, 240, 420),
    ]);

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

function drawWaterTank() {
    var material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5, depthWrite: false });
    var tank = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), material);
    tank.position.set(162, 240, 420);
    tank.frustumCulled = false;  // ✅ prevents disappearing on camera rotate
    serreGroup.add(tank);

    var material = new THREE.MeshPhongMaterial({ 
        color: 0x0000FF, 
        transparent: true, 
        opacity: 0.5, 
        depthWrite: false 
    });
    waterMesh = new THREE.Mesh(new THREE.BoxGeometry(30, waterlevel, 32), material);
    waterMesh.position.set(162, tankBottom + waterlevel / 2, 420);
    waterMesh.frustumCulled = false;  // ✅ prevents disappearing on camera rotate
    serreGroup.add(waterMesh);
}

function drawWaterDrops() {

    const geometry = new THREE.SphereGeometry(1, 8, 8);

    const material = new THREE.MeshPhongMaterial({
        color: 0x4aa3ff,
        transparent: true,
        opacity: 0.9
    });

    dropMesh = new THREE.InstancedMesh(geometry, material, DROP_COUNT);
    serreGroup.add(dropMesh);

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

function createSplash(position) {

    const geo = new THREE.SphereGeometry(0.6, 6, 6);
    const mat = new THREE.MeshPhongMaterial({ color: 0x4aa3ff });

    for (let i = 0; i < 5; i++) {

        let p = new THREE.Mesh(geo, mat);

        p.position.copy(position);

        p.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 0.4,
            (Math.random() - 0.5) * 0.5
        );

        p.userData.life = 0.4;

        window.scene.add(p);
        splashParticles.push(p);
    }
}

function drawLCD(){

    var lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 356;
    lcdCanvas.height = 64;
    var lcdCtx = lcdCanvas.getContext('2d');
    lcdCtx.fillStyle = '#006400';
    lcdCtx.fillRect(0, 0, 356, 64);
    lcdCtx.fillStyle = '#000000';
    lcdCtx.font = 'bold 20px monospace';
    lcdCtx.fillText('Temp: ' + temp + '°C', 10, 25);
    lcdCtx.fillText('Hum sol: ' + humSol, 10, 50);
    lcdCtx.fillText('Lum: ' + lum + 'Lux', 170, 25);
    lcdCtx.fillText('Hum air: ' + humAir + '%', 170, 50);
    var lcdTexture = new THREE.CanvasTexture(lcdCanvas);

    var material = new THREE.MeshPhongMaterial({
        map: lcdTexture,
        transparent: true,
        opacity: 0.9,
        shininess: 100,
        side: THREE.DoubleSide
    });

    var lcdScreen = new THREE.Mesh(
        new THREE.BoxGeometry(120, 20, 10),
        material
    );
    lcdScreen.position.set(-80, 360, 455);
    serreGroup.add(lcdScreen); 

    var lcdBack = new THREE.Mesh(
        new THREE.BoxGeometry(135, 35, 5),
        new THREE.MeshPhongMaterial({ color: 0x006600 })
    );
    lcdBack.position.set(-80, 360, 450);
    serreGroup.add(lcdBack);

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

function drawServo(){

    var servo = new THREE.Mesh(new THREE.BoxGeometry(20, 40, 20), new THREE.MeshPhongMaterial({ color: 0x333333 }));
    servo.position.set(70, 420, 450);
    servo.rotation.z = Math.PI/2.6;
    serreGroup.add(servo);

    var axe = new THREE.Mesh(new THREE.CylinderGeometry(2,2,15,24), new THREE.MeshPhongMaterial({color: 0x8E8E8E}));
    axe.position.set(80, 420, 435);
    axe.rotation.x = Math.PI/2;
    serreGroup.add(axe);

    var shape = new THREE.Shape();

    var r1 = 10, cx1 = -65, cy1 = 0;
    var r2 = 15, cx2 = 0,    cy2 = 0;

    shape.moveTo(cx1, cy1 + r1);
    shape.lineTo(cx2, cy2 + r2);

    shape.absarc(cx2, cy2, r2, Math.PI / 2, -Math.PI / 2, true);

    shape.lineTo(cx1, cy1 - r1);

    shape.absarc(cx1, cy1, r1, -Math.PI / 2, Math.PI / 2, true);

    var geometry = new THREE.ExtrudeGeometry(shape,{depth:5, bevelEnabled: false});
    var material = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide});
    beltMesh = new THREE.Mesh(geometry, material);
    beltMesh.position.set(80, 420, 430);  // centré sur le grand cercle = position du servo
    beltMesh.rotation.z = -(Math.PI*1.3);
    serreGroup.add(beltMesh);    

}

function drawMovableBox() {
    boxGroup = new THREE.Group();
    boxGroup.position.set(0, 610, 0);
    boxGroup.rotation.x = Math.PI/2;
    window.scene.add(boxGroup);

    var btnSize = 14;
    var gap     = 170;
    var faceZ   = 3.5;

    // Main box
    var box = new THREE.Mesh(
        new THREE.BoxGeometry(200, 160, 5),
        new THREE.MeshPhongMaterial({ color: 0x8B4513, shininess: 80, specular: 0x553311 })
    );
    boxGroup.add(box);

    screenTexture = new THREE.TextureLoader().load('/media/camera/photo_latest.jpg');
    screenMaterial = new THREE.MeshPhongMaterial({ map: screenTexture });
    var frontScreen = new THREE.Mesh(
        new THREE.BoxGeometry(150, 112.5, 1),
        screenMaterial
    );

    frontScreen.position.set(0, 10, faceZ);
    frontScreen.rotation.y = Math.PI;
    boxGroup.add(frontScreen);
    
    // Front face: photo name label using TextGeometry
    var fontLoader = new FontLoader();
// ✅ URL goes in fontLoader.load(), makeLabel has actual content
fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
    function makeLabel(text) {
        const geo = new TextGeometry(text, {
	    font: font,
	    size: 4,
	    curveSegments: 120,
        height:1,

        });
        geo.center();
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, 72, faceZ);
        return mesh;
    }

    if (photoLabelMesh) {
        boxGroup.remove(photoLabelMesh);
        photoLabelMesh.geometry.dispose();
    }
    photoLabelMesh = makeLabel('sdd');
    boxGroup.add(photoLabelMesh);

    window.setPhotoLabel = function(path) {
        const filename = path.split('/').pop() || 'NO NAME';
        if (photoLabelMesh) {
            boxGroup.remove(photoLabelMesh);
            photoLabelMesh.geometry.dispose();
        }
        photoLabelMesh = makeLabel(filename);
        boxGroup.add(photoLabelMesh);
    };
});


    // Front face: navigation buttons
    var navDefs = [
        { label: '←', dir: 'left',  x: -gap / 2, y: 0 },
        { label: '→', dir: 'right', x:  gap / 2, y: 0 },
        { label: 'last', dir: 'last', x: 0, y: -60 },
        { label: 'close', dir: 'close', x: 85, y: 60}
    ];

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


    screenTextureBack = new THREE.TextureLoader().load('/media/camera/photo_latest.jpg');
    screenMaterialBack = new THREE.MeshPhongMaterial({ map: screenTextureBack });
    var screen = new THREE.Mesh(new THREE.BoxGeometry(150, 112.5, 1), screenMaterialBack);
    screen.position.set(0, 10, -faceZ);
    boxGroup.add(screen);

    // ← auto reload every 10 minutes
    function scheduleHourlyReload() {
        var msUntilNext = 10 * 60 * 1000 + 1000;  // 10 minutes and 1 second in milliseconds
        setTimeout(function() {
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
            scheduleHourlyReload();
        }, msUntilNext);
    }
    scheduleHourlyReload();

    // Back face: scroll button (flips back to front)
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

    // Back face: reload button
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


    var normalTexR  = makeButtonCanvas('close', false);
    var pressedTexR = makeButtonCanvas('close', true);
    var matR = new THREE.MeshBasicMaterial({ map: normalTexR });
    var btnReload = new THREE.Mesh(new THREE.BoxGeometry(btnSize, btnSize, 2), matR);
    btnReload.position.set(-85, 60, -faceZ);
    btnReload.rotation.y = Math.PI;
    btnReload.userData.direction  = 'close';
    btnReload.userData.normalTex  = normalTexR;
    btnReload.userData.pressedTex = pressedTexR;
    btnReload.userData.mat        = matR;
    boxGroup.add(btnReload);
    Buttons.push(btnReload);
}

var boxRaycaster = new THREE.Raycaster();   
var boxMouse     = new THREE.Vector2();

function loadPhotoAtIndex(i) {
    if (!photoList || photoList.length === 0) return;

    photoIndex = ((i % photoList.length) + photoList.length) % photoList.length;

    var url = photoList[photoIndex].path + '?t=' + Date.now();

    var old = screenTexture;
    new THREE.TextureLoader().load(url, function(newTexture) {
        screenMaterial.map = newTexture;
        screenMaterial.needsUpdate = true;
        if (old) old.dispose();
        screenTexture = newTexture;
    });

    if (window.setPhotoLabel) window.setPhotoLabel(photoList[photoIndex].path);
}


function initBoxClicks() {
    renderer.domElement.addEventListener('pointerdown', function(e) {
        var rect    = renderer.domElement.getBoundingClientRect();
        boxMouse.x  = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
        boxMouse.y  = ((e.clientY - rect.top)  / rect.height) * -2 + 1;

        boxRaycaster.setFromCamera(boxMouse, camera);
        var hits = boxRaycaster.intersectObjects(Buttons);

        if (hits.length > 0) {
            var btn = hits[0].object;
            var dir = btn.userData.direction;

            // Visual press feedback
            btn.userData.mat.map = btn.userData.pressedTex;
            btn.userData.mat.needsUpdate = true;
            btn.scale.setScalar(0.88);

            setTimeout(function() {
                btn.userData.mat.map = btn.userData.normalTex;
                btn.userData.mat.needsUpdate = true;
                btn.scale.setScalar(1.0);
            }, 180);

            if (dir === 'Photo') {
                var isOut = boxGroupTargetZ === 0;  // true = currently hidden, moving to visible
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

            if (dir === 'last') {
                // flip to back face
                boxGroupTargetRotY += Math.PI;
            }

            if (dir === 'scroll') {
                // flip back to front face
                boxGroupTargetRotY += Math.PI;
            }

            if (dir ==='close'){

                boxGroupTargetX    = isOut ?  0    : 0;
                boxGroupTargetY    = isOut ?  610  : 610;
                boxGroupTargetZ    = isOut ?  430  : 0;

                camera.position.set(0, 500, 1500);
                cameraControls.target.set(0, 43, -8);

                // lock camera

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

            if (dir === 'reload') {
                // reload the latest photo texture
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

            if (dir === 'left') {
                // handle left navigation
                loadPhotoAtIndex(photoIndex - 1);
            }   

            if (dir === 'right') {
                // handle right navigation
                loadPhotoAtIndex(photoIndex + 1);
            }
        }
    });
}

function init() {
    var container = document.querySelector('.container');
    var canvasWidth = container.offsetWidth;
    var canvasHeight = 700;
    var canvasRatio = canvasWidth / canvasHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColor(0x999999, 1.0);
    // renderer.shadowMap.enabled = true; // shadow_code

    camera = new THREE.PerspectiveCamera(30, canvasRatio, 1, 10000);
    cameraControls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 500, 1500);
    cameraControls.target.set(0, 43, -8);

    // lock camera

    cameraControls.enablePan = false;
    cameraControls.maxPolarAngle = Math.PI / 2.3;
    cameraControls.minPolarAngle = Math.PI / 4;
    cameraControls.minAzimuthAngle = -0.2;
    cameraControls.maxAzimuthAngle = 0.2;
    cameraControls.minDistance = 500;
    cameraControls.maxDistance = 2000;
}

function addToDOM() {
    var container = document.getElementById('webGL');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length > 0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild(renderer.domElement);
}

function animate() {
    window.requestAnimationFrame(animate);
    render();
}

var toitTargetAngle = -1.95;

window.setToitAngle = function(servoAngle) {
    toitTargetAngle = servoAngle >= 180 ? -2.2 : -1.95;
};

var ledLights = [];

var ledLightPosition = [
    { x: -100, y: 430, z: 310 },
    { x: -100, y: 430, z: 390 }
];

function drawLedLights() {
    ledLightPosition.forEach(pos => {
        var light = new THREE.SpotLight(0xFF0000, 0);
        light.position.set(pos.x, pos.y, pos.z);
        light.distance = 400;
        light.angle = Math.PI / 15;
        light.penumbra = 0.2;
        // light.castShadow = true; // shadow_code

        var ledTarget = new THREE.Object3D();
        ledTarget.position.set(potPosition.x, potPosition.y + 70, potPosition.z);
        serreGroup.add(ledTarget);
        light.target = ledTarget;

        serreGroup.add(light);
        ledLights.push(light);

        /*
        var helper = new THREE.SpotLightHelper(light);
        serreGroup.add(helper); 
        */      
    });

}

window.setLedIntensity = function(ledState) {
    var intensity = (ledState === 'ON') ? 250000 : 0;
    ledLights.forEach(function(l) { l.intensity = intensity; });
};

window.setPompeState = function(pompeState) {
    pumpLedMaterial.color.set(pompeState === 'ON' ? 0x00ff00 : 0xff0000);
    if (pompeState === 'ON') {  
        waterTube = 0.8; 
    } else {
        waterTube = 0;  
    }
};

window.setPompeLock = function(lockTime) {
    if (lockMaterial) {
        if (lockTime == 0 || lockTime == 600) {
            lockMaterial.opacity = 0;
        } else {
            lockMaterial.opacity = 1;
        }
    }
};

window.setTemp = function(newTemp) {    
    temp = newTemp;
    if (window.setLCDText) window.setLCDText();
};

window.setHumAir = function(newHumAir) {
    humAir = newHumAir;
    if (window.setLCDText) window.setLCDText();
};

window.setHumSol = function(newHumSol) {
    humSol = newHumSol;
    if (window.setLCDText) window.setLCDText();
};

window.setLumiere = function(newLumiere) {
    lum = newLumiere;
    if (window.setLCDText) window.setLCDText();
};

window.setEauStock = function(eauStock) {
    waterlevel = (eauStock/100)*waterFull;
};


function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);

    if (toitMovible) {
        toitMovible.rotation.z += (toitTargetAngle - toitMovible.rotation.z) * 0.05;
        if (beltMesh) {
            beltMesh.rotation.z += (toitTargetAngle - toitMovible.rotation.z) * 0.15;
        }
    }

    if (boxGroup) {
        var speed = 0.02;
        boxGroup.position.x   += (boxGroupTargetX    - boxGroup.position.x)   * speed;
        boxGroup.position.y   += (boxGroupTargetY    - boxGroup.position.y)   * speed;
        boxGroup.position.z   += (boxGroupTargetZ    - boxGroup.position.z)   * speed;
        boxGroup.rotation.x   += (boxGroupTargetRotX - boxGroup.rotation.x)   * speed;
        boxGroup.rotation.y   += (boxGroupTargetRotY - boxGroup.rotation.y)   * (speed*10);
    }

    if (waterMesh) {
        waterMesh.scale.y = waterlevel / 20;
        waterMesh.position.y = tankBottom + waterlevel / 2;
    }

    if (innerPipeMaterial) {
        innerPipeMaterial.opacity = waterTube;
    }

    if (innerPipeMaterial1) {
        innerPipeMaterial1.opacity = waterTube;
    }

    dropTimer += delta;

    for (let i = 0; i < DROP_COUNT; i++) {

        const drop = dropData[i];

        if (waterTube > 0) {

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

            if (drop.active) {

                drop.velocity.y += gravity;
                drop.position.add(drop.velocity);

                if (drop.position.y < potPosition.y + 40) {

                    createSplash(drop.position);
                    drop.active = false;

                }

            }

        } else {

            drop.active = false;

        }

        if (drop.active) {
            tempPosition.copy(drop.position);
        } else {
            tempPosition.set(0, -1000, 0);
        }

        tempMatrix.setPosition(tempPosition);
        dropMesh.setMatrixAt(i, tempMatrix);
    }

    dropMesh.instanceMatrix.needsUpdate = true;

    /* Update splash particles */
    splashParticles.forEach((p, i) => {

        p.userData.velocity.y += gravity * 0.3;
        p.position.add(p.userData.velocity);

        p.userData.life -= delta;

        if (p.userData.life <= 0) {
            window.scene.remove(p);
            splashParticles.splice(i, 1);
        }

    });

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
    });
    addToDOM();
    animate();
    initBoxClicks();
} catch(e) {
    console.error("WebGL error:", e);
}