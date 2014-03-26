//
//  bot.js
//  hifi
//
//  Created by Stephen Birarda on 2/20/14.
//  Modified by Philip on 3/3/14
//  Copyright (c) 2014 HighFidelity, Inc. All rights reserved.
//
//  This is an example script that demonstrates an NPC avatar.
//
//

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function printVector(string, vector) {
    print(string + " " + vector.x + ", " + vector.y + ", " + vector.z);
}

var CHANCE_OF_MOVING = 0.005; 
var CHANCE_OF_SOUND = 0.005;
var CHANCE_OF_HEAD_TURNING = 0.05;
var CHANCE_OF_BIG_MOVE = 0.1;
var CHANCE_OF_WAVING = 0.005;     //  Currently this isn't working

var shouldReceiveVoxels = true; 
var VOXEL_FPS = 60.0;
var lastVoxelQueryTime = 0.0;

var isMoving = false;
var isTurningHead = false;
var isPlayingAudio = false; 
var isWaving = false;
var waveFrequency = 0.0;
var waveAmplitude = 0.0; 

var X_MIN = 0.0;
var X_MAX = 5.0;
var Z_MIN = 0.0;
var Z_MAX = 5.0;
var Y_PELVIS = 2.5;
var SHOULDER_JOINT_NUMBER = 15; 

var MOVE_RANGE_SMALL = 0.5;
var MOVE_RANGE_BIG = Math.max(X_MAX - X_MIN, Z_MAX - Z_MIN) / 2.0;
var TURN_RANGE = 70.0;
var STOP_TOLERANCE = 0.05;
var MOVE_RATE = 0.05;
var TURN_RATE = 0.15;
var PITCH_RATE = 0.20;
var PITCH_RANGE = 30.0;

var firstPosition = { x: getRandomFloat(X_MIN, X_MAX), y: Y_PELVIS, z: getRandomFloat(Z_MIN, Z_MAX) };
var targetPosition =  { x: 0, y: 0, z: 0 };
var targetDirection = { x: 0, y: 0, z: 0, w: 0 };
var currentDirection = { x: 0, y: 0, z: 0, w: 0 };
var targetHeadPitch = 0.0;

var cumulativeTime = 0.0;

var sounds = [];
loadSounds();

function clamp(val, min, max){
    return Math.max(min, Math.min(max, val))
}

//  Play a random sound from a list of conversational audio clips
var AVERAGE_AUDIO_LENGTH = 8000;
function playRandomSound() {
  if (!Agent.isPlayingAvatarSound) {
    var whichSound = Math.floor((Math.random() * sounds.length) % sounds.length);
    Agent.playAvatarSound(sounds[whichSound]);
  }
}

// pick an integer between 1 and 20 for the face model for this bot
botNumber = getRandomInt(1, 100);

if (botNumber <= 20) {
  newFaceFilePrefix = "bot" + botNumber;
  newBodyFilePrefix = "defaultAvatar_body"
} else {
  if (botNumber <= 40) {
    newFaceFilePrefix = "superhero";
  } else if (botNumber <= 60) {
    newFaceFilePrefix = "amber";
  } else if (botNumber <= 80) {
    newFaceFilePrefix = "ron";
  } else {
    newFaceFilePrefix = "angie";
  }
  
  newBodyFilePrefix = "bot" + botNumber;
} 

// set the face model fst using the bot number
// there is no need to change the body model - we're using the default
Avatar.faceModelURL = "https://s3-us-west-1.amazonaws.com/highfidelity-public/meshes/" + newFaceFilePrefix + ".fst";
Avatar.skeletonModelURL = "https://s3-us-west-1.amazonaws.com/highfidelity-public/meshes/" + newBodyFilePrefix + ".fst";
Avatar.billboardURL = "https://s3-us-west-1.amazonaws.com/highfidelity-public/meshes/billboards/bot" + botNumber + ".png";

Agent.isAvatar = true;
Agent.isListeningToAudioStream = true;

// change the avatar's position to the random one
Avatar.position = firstPosition;  
printVector("New bot, position = ", Avatar.position);

function stopWaving() {
  isWaving = false; 
  Avatar.clearJointData(SHOULDER_JOINT_NUMBER);
}

function updateBehavior(deltaTime) {
  
  cumulativeTime += deltaTime;

  if (shouldReceiveVoxels && ((cumulativeTime - lastVoxelQueryTime) > (1.0 / VOXEL_FPS))) {
    VoxelViewer.setPosition(Avatar.position);
    VoxelViewer.setOrientation(Avatar.orientation);
    VoxelViewer.queryOctree();
    lastVoxelQueryTime = cumulativeTime;
    /*
    if (Math.random() < (1.0 / VOXEL_FPS)) {
      print("Voxels in view = " + VoxelViewer.getOctreeElementsCount());
    }*/
  }

  if (!isWaving && (Math.random() < CHANCE_OF_WAVING)) {
    isWaving = true;
    waveFrequency = 1.0 + Math.random() * 5.0;
    waveAmplitude = 5.0 + Math.random() * 60.0;
    Script.setTimeout(stopWaving, 1000 + Math.random() * 2000);
  } else if (isWaving) {
    Avatar.setJointData(SHOULDER_JOINT_NUMBER, Quat.fromPitchYawRollDegrees(0.0, 0.0,  waveAmplitude * Math.sin(cumulativeTime * waveFrequency)));
  }

  if (Math.random() < CHANCE_OF_SOUND) {
    playRandomSound();
  }

  if (!isTurningHead && (Math.random() < CHANCE_OF_HEAD_TURNING)) {
    targetHeadPitch = getRandomFloat(-PITCH_RANGE, PITCH_RANGE);
    isTurningHead = true;
  } else {
    Avatar.headPitch = Avatar.headPitch + (targetHeadPitch - Avatar.headPitch) * PITCH_RATE;
    if (Math.abs(Avatar.headPitch - targetHeadPitch) < STOP_TOLERANCE) {
      isTurningHead = false;
    }
  }
  if (!isMoving && (Math.random() < CHANCE_OF_MOVING)) {
    // Set new target location
    targetDirection = Quat.multiply(Avatar.orientation, Quat.angleAxis(getRandomFloat(-TURN_RANGE, TURN_RANGE), { x:0, y:1, z:0 }));
    var front = Quat.getFront(targetDirection);
    if (Math.random() < CHANCE_OF_BIG_MOVE) {
        targetPosition = Vec3.sum(Avatar.position, Vec3.multiply(front, getRandomFloat(0.0, MOVE_RANGE_BIG)));
    } else {
        targetPosition = Vec3.sum(Avatar.position, Vec3.multiply(front, getRandomFloat(0.0, MOVE_RANGE_SMALL)));
    }
    targetPosition.x = clamp(targetPosition.x, X_MIN, X_MAX);
    targetPosition.z = clamp(targetPosition.z, Z_MIN, Z_MAX);
    targetPosition.y = Y_PELVIS;
    
    isMoving = true;
  } else { 
    Avatar.position = Vec3.sum(Avatar.position, Vec3.multiply(Vec3.subtract(targetPosition, Avatar.position), MOVE_RATE));
    Avatar.orientation = Quat.mix(Avatar.orientation, targetDirection, TURN_RATE);
    if (Vec3.length(Vec3.subtract(Avatar.position, targetPosition)) < STOP_TOLERANCE) {
       isMoving = false;  
    }
  }
}

Script.update.connect(updateBehavior);

var SOUND_BASE_URL = "https://s3-us-west-1.amazonaws.com/highfidelity-public/sounds/Cocktail+Party+Snippets/Raws/"

function loadSounds() {
  var sound_filenames = ["AB1.raw", "Anchorman2.raw", "B1.raw", "B1.raw", "Bale1.raw", "Bandcamp.raw",
    "Big1.raw", "Big2.raw", "Brian1.raw", "Buster1.raw", "CES1.raw", "CES2.raw", "CES3.raw", "CES4.raw", 
    "Carrie1.raw", "Carrie3.raw", "Charlotte1.raw", "EN1.raw", "EN2.raw", "EN3.raw", "Eugene1.raw", "Francesco1.raw"
    "Italian1.raw", "Japanese1.raw", "Leigh1.raw", "Lucille1.raw", "Lucille2.raw", "MeanGirls.raw", "Murray2.raw",
    "Nigel1.raw", "PennyLane.raw", "Pitt1.raw", "Ricardo.raw", "SN.raw", "Sake1.raw", "Samantha1.raw", "Samantha2.raw", 
    "Spicoli1.raw", "Supernatural.raw", "Swearengen1.raw", "TheDude.raw", "Tony.raw", "Triumph1.raw", "Uma1.raw"
    "Walken1.raw", "Walken2.raw", "Z1.raw", "Z2.raw"
  ];
  
  for (var i = 0; i < sound_filenames.length; i++) {
      sounds.push(new Sound(SOUND_BASE_URL + sound_filenames[i]));
  }
}
