/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import '@tensorflow/tfjs-backend-webgl';
import * as mpPose from '@mediapipe/pose';

import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import {game} from "./space-invarders/app";

import '@tensorflow/tfjs-backend-cpu';
// Import @tensorflow/tfjs-core
import * as tf from '@tensorflow/tfjs-core';
// Import @tensorflow/tfjs-tflite.
import * as tflite from '@tensorflow/tfjs-tflite';


tflite.setWasmPath(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
      tflite.version_wasm}/dist/`);

import * as posedetection from '@tensorflow-models/pose-detection';

import {Camera} from './camera';
import {setModel} from './option_panel';
import {STATE} from './params';
import {setBackendAndEnvFlags} from './util';
import { IFFT } from '@tensorflow/tfjs-core';

let detector, camera, stats;
let startInferenceTime, numInferences = 0;
let inferenceTimeSum = 0, lastPanelUpdate = 0;
let rafId;

const cameraOptions = document.querySelector('.video-options>select');

async function createDetector() {
  switch (STATE.model) {    
    case posedetection.SupportedModels.MoveNet:
      let modelType;
      if (STATE.modelConfig.type == 'lightning') {
        modelType = posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
      } else if (STATE.modelConfig.type == 'thunder') {
        modelType = posedetection.movenet.modelType.SINGLEPOSE_THUNDER;
      } else if (STATE.modelConfig.type == 'multipose') {
        modelType = posedetection.movenet.modelType.MULTIPOSE_LIGHTNING;
      }
      const modelConfig = {modelType};

      if (STATE.modelConfig.customModel !== '') {
        modelConfig.modelUrl = STATE.modelConfig.customModel;
      }
      if (STATE.modelConfig.type === 'multipose') {
        modelConfig.enableTracking = STATE.modelConfig.enableTracking;
      }
      return posedetection.createDetector(STATE.model, modelConfig);
  }
}

async function checkGuiUpdate() {
  if (STATE.isTargetFPSChanged || STATE.isSizeOptionChanged) {    
    STATE.isTargetFPSChanged = false;
    STATE.isSizeOptionChanged = false;
  }

  if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
    STATE.isModelChanged = true;

    window.cancelAnimationFrame(rafId);

    if (detector != null) {
      detector.dispose();
    }

    if (STATE.isFlagChanged || STATE.isBackendChanged) {
      await setBackendAndEnvFlags(STATE.flags, STATE.backend);
    }

    try {
      detector = await createDetector(STATE.model);
    } catch (error) {
      detector = null;
      alert(error);
    }

    STATE.isFlagChanged = false;
    STATE.isBackendChanged = false;
    STATE.isModelChanged = false;
  }
}

function beginEstimatePosesStats() {
  startInferenceTime = (performance || Date).now();
}

function endEstimatePosesStats() {
  const endInferenceTime = (performance || Date).now();
  inferenceTimeSum += endInferenceTime - startInferenceTime;
  ++numInferences;

  const panelUpdateMilliseconds = 1000;
  if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
    const averageInferenceTime = inferenceTimeSum / numInferences;
    inferenceTimeSum = 0;
    numInferences = 0;    
    lastPanelUpdate = endInferenceTime;
  }
}
let nose = {x:0,y:0};
async function renderResult() {
  if (camera.video.readyState < 2) {
    await new Promise((resolve) => {
      camera.video.onloadeddata = () => {
        resolve(video);
        if(!!nose.x){
          camera.drawCircle(nose);
        }
        
      };
    });
  }

  let poses = null;
  
  // Detector can be null if initialization failed (for example when loading
  // from a URL that does not exist).
  if (detector != null) {
    // FPS only counts the time it takes to finish estimatePoses.
    beginEstimatePosesStats();

    // Detectors can throw errors, for example when using custom URLs that
    // contain a model that doesn't provide the expected output.
    try {
      poses = await detector.estimatePoses(
          camera.video,
          {maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false});
      let newNose = poses[0].keypoints.filter(el=>el.name=="nose");
      if(newNose[0].score > 0.5){
        parseNoseMovement(nose,newNose[0]);       
        camera.drawCtx();
        camera.drawCircle(nose);
      } else{
        console.log(newNose[0].score);
      }          
    } catch (error) {
      //detector.dispose();
      //detector = null;   
    }    
  }  
}
let clock = new Date();
function parseNoseMovement(prev,curr){
  let e={};
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let x = formatter.format(curr.x);
  let y = formatter.format(curr.y);
  if(x!==prev.x || y!==prev.y){
    if(x-15>= prev.x){
      e.key="ArrowLeft";
    }
    if(x+15<= prev.x){
      e.key="ArrowRight";
    }
    
    let updateTime = new Date();
    if(nose.x==0) {nose = {x,y};}      
    if(updateTime-clock>=250){
      clock = updateTime;
      if(game.getGameLevel()>0){
        game.moveShooter(e);
      }          
    }        
  }  
}

async function renderPrediction() {
  await checkGuiUpdate();

  if (!STATE.isModelChanged) {
    await renderResult();
  }

  rafId = requestAnimationFrame(renderPrediction);
};

const getCameraSelection = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  const options = videoDevices.map(videoDevice => {
    return `<option value="${videoDevice.deviceId}">${videoDevice.label} ${videoDevice.deviceId}</option>`;
  });
  cameraOptions.innerHTML = `<option value="">Select camera</option>`.concat(options.join(''));
};

async function app() {
       
  await setModel("movenet");  
  camera = new Camera();

  getCameraSelection().then(()=> {      
    cameraOptions.onchange = () => {            
      STATE.camera.deviceId = {
        exact: cameraOptions.value
      }      
      document.querySelector('#start').style.display="block";
      camera.setupCamera(STATE.camera).then(cam=> {
        camera = cam; 
        renderPrediction()
      });      
    };      
  }); 
  
  camera.setupCamera(STATE.camera).then(cam=> camera = cam);
  await setBackendAndEnvFlags(STATE.flags, STATE.backend);

  detector = await createDetector();

  
};
// select element by id
let start = document.getElementById("start");

start.addEventListener("click", function(el) {
  document.getElementById("invaders").style.display='block';
  game.initGame(1);
  start.style.display='none';
});
app();

