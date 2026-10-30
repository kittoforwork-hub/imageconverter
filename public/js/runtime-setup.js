/*
 * PDF.js and canvas runtime setup.
 * Keep this file after the vendor libraries and before the application modules.
 */
(() => {
  'use strict';

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  window.KittoCanvasFactory = {
    create(width, height) {
      if (width <= 0 || height <= 0) {
        throw new Error('Invalid canvas size');
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);

      const context = canvas.getContext('2d', {
        alpha: true,
        willReadFrequently: true
      });

      if (!context) {
        throw new Error('Unable to create 2D canvas context');
      }

      return { canvas, context };
    },

    reset(canvasAndContext, width, height) {
      if (!canvasAndContext || !canvasAndContext.canvas) {
        throw new Error('Canvas is not specified');
      }

      const canvas = canvasAndContext.canvas;
      canvas.width = Math.ceil(width);
      canvas.height = Math.ceil(height);

      const context = canvas.getContext('2d', {
        alpha: true,
        willReadFrequently: true
      });

      if (!context) {
        throw new Error('Unable to create 2D canvas context');
      }

      canvasAndContext.context = context;
    },

    destroy(canvasAndContext) {
      if (!canvasAndContext || !canvasAndContext.canvas) return;

      canvasAndContext.canvas.width = 1;
      canvasAndContext.canvas.height = 1;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    }
  };
})();
