import numpy as np
from skimage.measure import block_reduce
import sys
from stl import mesh
from matplotlib import pyplot
from mpl_toolkits import mplot3d

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

    def render_meshes(self, meshes):
        # Create a new plot
        figure = pyplot.figure()
        axes = mplot3d.Axes3D(figure)

        # Render the cube faces
        for m in meshes:
            axes.add_collection3d(mplot3d.art3d.Poly3DCollection(m.vectors))

        # Auto scale to the mesh size
        scale = numpy.concatenate([m.points for m in meshes]).flatten(-1)
        axes.auto_scale_xyz(scale, scale, scale)

        # Show the plot to the screen
        pyplot.show()

    def test(self):
        img = self.load_depth_img()
        print(img.shape)

if __name__ == '__main__':
    mb = MeshBuilder()
    mb.test()

