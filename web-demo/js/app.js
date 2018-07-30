/*
 * js/app.js
 * Created: Thu Jan 25 2018 01:17:09 GMT+0530 (IST)
 * Copyright 2018 Harish.K<harish2704@gmail.com>
 */
var jquery = require('jquery');
var ndarray = require('ndarray');
var ndarrayOps = require('ndarray-ops');
var ndarrayUnpack = require('ndarray-unpack');
require('cropper');
var glyphsList = require('../data/glyphs.json');
var tensorUtils = require('./tensor');
glyphsList.unshift('');
var $=jquery;
var _ = require('lodash');
var  range = a=> Array.from( new Uint32Array(a) ).map((v,i) => i );
var IMG_WIDTH = 1024;
var IMG_HEIGHT = 32;

Object.assign( window, {
  ndarray,
  ndarrayOps,
  ndarrayUnpack,
  _l: _,
});

function initVue(){
  var app = new Vue({
    el: '#dbg',
    data: {
      modelLoading: false,
      layerOutputImages: [],
      scalingFactor: [
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      12,
      12,
      12,
      12,
      ],
    },
		methods:{
			updateDbg: function updateDbg( model ){
				const outputs = []
				model.modelLayersMap.forEach((layer, name) => {
					if (name === 'input') return;
					let images = []
					if (layer.hasOutput && layer.output && layer.output.tensor.shape.length === 3) {
						images = tensorUtils.unroll3Dtensor(layer.output.tensor)
					} else if (layer.hasOutput && layer.output && layer.output.tensor.shape.length === 2) {
						images = [tensorUtils.image2Dtensor(layer.output.tensor)]
					} else if (layer.hasOutput && layer.output && layer.output.tensor.shape.length === 1) {
						images = [tensorUtils.image1Dtensor(layer.output.tensor)]
					}
					outputs.push({ layerClass: layer.layerClass || '', name, images })
				})
				this.layerOutputImages = outputs
				setTimeout(() => {
					this.showIntermediateOutputs()
				}, 0)
			},

			showIntermediateOutputs: function showIntermediateOutputs() {
				this.layerOutputImages.forEach((output, layerNum) => {
					const scalingFactor = this.scalingFactor[layerNum]
					output.images.forEach((image, imageNum) => {
						const ctx = document.getElementById(`intermediate-output-${layerNum}-${imageNum}`).getContext('2d')
						ctx.putImageData(image, 0, 0)
						const ctxScaled = document
							.getElementById(`intermediate-output-${layerNum}-${imageNum}-scaled`)
							.getContext('2d')
						ctxScaled.save()
            ctxScaled.webkitImageSmoothingEnabled = false;
            ctxScaled.mozImageSmoothingEnabled = false;
            ctxScaled.imageSmoothingEnabled = false;
						ctxScaled.scale(scalingFactor, scalingFactor)
						ctxScaled.clearRect(0, 0, ctxScaled.canvas.width, ctxScaled.canvas.height)
						ctxScaled.drawImage(document.getElementById(`intermediate-output-${layerNum}-${imageNum}`), 0, 0)
						ctxScaled.restore()
					})
				})
			},
		}

  })
  window.app = app;
}


$(function() {

  initVue();

  if( !KerasJS.GPU_SUPPORT ){
    alert('Sorry. WebGL 2 support not found. \nExiting...');
    $('.container').hide();
  }
  var img = $('#for-cropper');
  var output = $('#output');
  var outputRaw = $('#output-raw');
  var tmpScaleCanvas = document.createElement('canvas');
  tmpScaleCanvas.width = 2048;
  tmpScaleCanvas.height = IMG_HEIGHT;
  var tmpScaleCanvasCtx = tmpScaleCanvas.getContext('2d');
  var imgCropper = img.cropper();

  function initUi() {

    $(".input-file").before(
      function() {
        if ( !$(this).prev().hasClass('input-ghost') ) {
          var element = $("<input type='file' class='input-ghost' accept=\"image/*\" style='visibility:hidden; height:0'>");
          element.attr("name",$(this).attr("name"));
          element.change(function( e ){
            var imgUrl = URL.createObjectURL(e.target.files[0]);
            imgCropper.data('cropper').replace( imgUrl );
            element.next(element).find('input').val((element.val()).split('\\').pop());
          });
          $(this).find("button.btn-choose").click(function(){
            element.click();
          });
          $(this).find('input').css("cursor","pointer");
          $(this).find('input').mousedown(function() {
            $(this).parents('.input-file').prev().click();
            return false;
          });
          return element;
        }
      }
    );

    $('#rotate-buttons > button').click(function(){
      imgCropper.data('cropper').rotate( $(this).data().degree )
    });
  }



    var model = new KerasJS.Model({
      filepath: './data/pottan.bin',
      gpu: true,
      transferLayerOutputs: true,
    });
  window.mm = model;

    model.events.on('loadingProgress',function( i ){
      console.log('loadingProgress', i );
    });
    // model.events.on('initProgress', this.handleInitProgress)
  function decodeStr( strEnc, raw=false ){
    return strEnc.map((v,i) => {
      return ( raw || ( strEnc[i-1] !== v )) ? glyphsList[ v ] : '';
    }).join('');
  }

  initUi();
  $('#run-btn').click(function(){
    if( !imgCropper ){
      return ;
    }
    var croppedCanvas = imgCropper.data('cropper').getCroppedCanvas();
    var scaleFactor = IMG_HEIGHT/croppedCanvas.height;
    var origWidth = croppedCanvas.width,
      newWidth = parseInt( scaleFactor * origWidth );
    tmpScaleCanvasCtx.drawImage( croppedCanvas, 0,0, newWidth, IMG_HEIGHT );
    var imageDataScaled = tmpScaleCanvasCtx.getImageData(0,0, newWidth, IMG_HEIGHT );

    var data = ndarray (
      Float32Array.from(imageDataScaled.data),
      [ imageDataScaled.height, imageDataScaled.width, 4 ]
    );
    // pick any one of the color channel. ( Here it is Green )
    data = data.pick( null, null, 1 );

    // Normalize the values . Fit between -1 & 1
    data = ndarrayOps.subseq( data, 127.5 );
    data = ndarrayOps.divseq( data, 127.5 );

    var input = ndarray( new Float32Array( IMG_HEIGHT * IMG_WIDTH ), [ IMG_HEIGHT, IMG_WIDTH ]);
    ndarrayOps.assigns( input, 1 );
    ndarrayOps.assign( input.hi( null, data.shape[1] ), data );


    model.predict({ input: input.data }).then(outputData => {
      var nClasses = glyphsList.length;
      var nPredictions = outputData.output.length/nClasses;
      outputData=ndarray( outputData.output,[ nPredictions, nClasses ] );
      var predictions = range(nPredictions).map( i => ndarrayOps.argmax( outputData.pick(i,null))[0] );
      var out = decodeStr( predictions );
      output.text( out );
      outputRaw.text( JSON.stringify( predictions ) );
      app.updateDbg( model );
    });
  });
});

