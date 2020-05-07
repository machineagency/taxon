import numpy as np
import pymesh
import sys

class MeshBuilder:
    def __init__(self):
        pass

    def load_depth_img(self):
        """
        Loads an .npy file of a depth image.
        Returns a NumPy array.
        """
        return np.load('sample_img.npy')

    def sample_heightmap(self):
        pass

    def test(self):
        img = self.load_depth_img()
        print(img.shape)

if __name__ == '__main__':
    mb = MeshBuilder()
    mb.test()

