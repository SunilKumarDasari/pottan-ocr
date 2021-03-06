#!/usr/bin/env python

#  ഓം ബ്രഹ്മാർപ്പണം
#
#  File name: pottan_ocr/ocr_hocr.py
#  Author: Harish.K<harish2704@gmail.com>
#  Copyright 2019 Harish.K<harish2704@gmail.com>
#  Date created: Tue Oct 01 2019 21:28:14 GMT+0530 (IST)
#  Date last modified: Tue Oct 01 2019 21:28:14 GMT+0530 (IST)
#  Python Version: 3.x





from PIL import Image
import argparse
import numpy as np
from keras import models
from pyquery import PyQuery as pq
from pyquery.text import extract_text

from pottan_ocr.utils import config, readFile, writeFile
from pottan_ocr.dataset import normaizeImg
from pottan_ocr.string_converter import decodeStr
from pottan_ocr import utils

#  from matplotlib import pyplot as plt

#  def imshow( img ):
    #  plt.imshow( img )
    #  plt.show()


imageHeight = config['imageHeight'] - 3

def resize_img( img ):
    origW, origH = img.size
    targetH = imageHeight
    targetW = int( origW * targetH/origH )
    img = img.resize( (targetW, targetH ), Image.BILINEAR )
    return normaizeImg( np.array( img ), 2 )

def ocr_images( images ):
    model = models.load_model( opt.crnn )
    maxWidth = max([i.shape[1] for i in images ])
    images = [ np.pad( i, [(2, 1), (0, maxWidth - i.shape[1] ), (0,0)], mode='constant', constant_values=1) for i in images ]
    out =  model.predict( np.array(images) )
    out = out.argmax(2)
    textResults = [ decodeStr( i, raw=False ) for i in out ]
    return textResults

def main( args ):
    img = Image.open( args.img ).convert('L')
    hocr =  readFile( args.hocr )
    dom = pq( hocr.encode('utf-8') )
    el_words = [ i for i in dom('.ocr_line') if extract_text(i).strip() ]
    #  import pdb; pdb.set_trace();
    #  from IPython import embed; embed()
    img_words = []
    for el in el_words:
        title = el.get('title');
        cords = [ int(i) for i in title.split(';')[0].split(' ')[1:] ]
        img_word = img.crop( cords )
        img_word = resize_img( img_word )
        img_words.append( img_word )
    ocr_res = ocr_images( img_words )
    for el, txt in zip( el_words, ocr_res):
        for child in el.getchildren(): el.remove( child )
        el.text = txt

        #  Word based ocr
        #  children = el.getchildren()
        #  if( len( children ) ):
            #  children[0].text = txt
        #  else:
            #  el.text = txt
    writeFile( args.output, dom.html().replace('</head>', "<style> .ocr_line{ display: block; } </style></head>" ) )

if( __name__ == '__main__' ):
    parser = argparse.ArgumentParser()
    parser.add_argument('--crnn', required=True, help="path to pre trained model ( Keras saved model )")
    parser.add_argument('--hocr', required=True,  help='Path to hocr output file')
    parser.add_argument('--img', required=True,  help='path to image file')
    parser.add_argument('--output', default="pottan_ocr_output.html", help='path to output file')
    opt = parser.parse_args()
    main( opt )
