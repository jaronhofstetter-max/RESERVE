import Ocr from '@gutenye/ocr-browser';
import {env} from 'onnxruntime-web';
import cv from '@techstark/opencv-js';
globalThis.RESERVE_DATE_BROWSER_OCR={Ocr,env,cv};
