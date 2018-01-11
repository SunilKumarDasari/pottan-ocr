#!/usr/bin/env python3

from utils import readFile, writeFile
from string_converter import encodeStr, decodeStr
import re
import numpy as np
import os
from PIL import Image
from dataset import TextDataset, getTrainingTexts






class DataGen:

    def __init__(self, infile, outfile ):
        self.WORD_LIST_FILE = infile
        self.DATA_FILE = outfile



    def testEncoding( self, opt ):
        """
        function for self testing.
        Encode each wrod, then decode it back
        """
        goodWords = []
        words = getTrainingTexts( self.WORD_LIST_FILE )
        for w in words:
            try:
                enc, encSize = encodeStr( w )
                goodWords.append( w )
            except Exception as e:
                print('Error encoding "%s"' % w, e )
                continue
            dec  = decodeStr( enc )
            if( w != dec ):
                raise ValueError('Encoding failed "%s" != "%s"'% ( w, dec ) )
        if( opt.update ):
            writeFile( self.WORD_LIST_FILE, '\n'.join( goodWords ))



    def createDataset( self, opts ):
        dataset = TextDataset( self.WORD_LIST_FILE )
        print( 'Dataset length=%d'%len(dataset))
        if( opts.format == 'numpy' ):
            np.savez_compressed( self.DATA_FILE, list( dataset ))
        else:
            os.system('mkdir -p %s' % self.DATA_FILE )
            for idx in range(len(dataset)):
                img, label = dataset[idx]
                img = Image.fromarray( img[0] )
                img.save( '%s/line_%s__%s__%s.png' %( self.DATA_FILE, dataset.words.index( label ), *dataset.getFont( idx ) ) )







def main( opt ):
    dg = DataGen( opt.input, opt.output )

    if( opt.testencoding ):
        print('Testing encodability of  dataset' )
        dg.testEncoding( opt )

    if( not opt.skip_creation ):
        print( 'Create dataset' )
        dg.createDataset( opt )
    print('Completed generating traindata for dataset\n\n' )



if( __name__ == '__main__' ):
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--testencoding', action='store_true', help='do encodability test on each workd in the wordlist')
    parser.add_argument('--update', action='store_true', help='Update input file with valid data after testencoding')
    parser.add_argument('--skip-creation', action='store_true', help='Skip dataset creation')
    parser.add_argument('--input', help='input text file contains words')
    parser.add_argument('--output', help='output numpy data file')
    parser.add_argument('--format', choices=[ 'numpy', 'images' ], default='numpy', help='Format of output. Numpy array vs Directory of images' )
    parser.add_argument('--name', help='name of dataset. ( Ie, input=./data/<name>.txt , output=./data/<name>_data.npz )')
    opt = parser.parse_args()
    if( opt.name ):
        opt.input = './data/%s.txt' % opt.name
        opt.output = './data/%s_data' % opt.name
    elif( opt.input and opt.output ):
        pass
    else:
        parser.error("Either '--name' or both '--input' and '--output' need to be specified")

    main( opt )

