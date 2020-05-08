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

    def downsample(self, img):
        return block_reduce(img, block_size=(16, 16), func=np.mean)

    def remove_outliers(self, img):
        # FIXME: doesn't seem to be working as intended
        MAX_Z = 3
        img_flat = img.flatten()
        m = np.mean(img_flat)
        s = np.std(img_flat)
        img_f = np.where(img < 3 * -s + m, 3 * -s + m, img)
        img_fc = np.where(img_f > 3 * s + m, 3 * s + m, img_f)
        return img_fc

    def normalize(self, img):
        NEW_MAX = img.shape[0]
        curr_max = np.max(img)
        factor = NEW_MAX / curr_max
        return factor * img

    def create_tile_faces(self, m_tile):
        """
        Takes in a greatly reduced image matrix aka "tile matrix" M_TILE,
        and returns a list of vertices corresponding to vertices of floating
        each tile according to that tile's depth.
        Per tile, starting at the NW corner, we push vertices in a clockwise
        order.
        For tile (x, y), the tile's vertices in the list will index range:
        [4 * (x + y * m_tile.width), 4 * (x + y * m_tile.width) + 3].
        ACTUALLY maybe we can just make two triangle faces?
        Returns ???
        """
        data = np.zeros(m_tile.size * 2, dtype=mesh.Mesh.dtype)
        m_tile_height, m_tile_width = m_tile.shape
        i = 0
        for y in range(m_tile_height):
            for x in range(m_tile_width):
                tile_depth = m_tile[y, x]
                v_nw = [x - 0.5, y - 0.5, tile_depth]
                v_ne = [x + 0.5, y - 0.5, tile_depth]
                v_se = [x + 0.5, y + 0.5, tile_depth]
                v_sw = [x - 0.5, y + 0.5, tile_depth]
                data['vectors'][i] = np.array([v_nw, v_ne, v_sw])
                data['vectors'][i + 1] = np.array([v_ne, v_sw, v_se])
                i += 2
        return data

    def render_meshes(self, meshes):
        # Create a new plot
        figure = pyplot.figure()
        axes = mplot3d.Axes3D(figure)

        # Render the cube faces
        for m in meshes:
            axes.add_collection3d(mplot3d.art3d.Poly3DCollection(m.vectors))

        # Auto scale to the mesh size
        scale = np.concatenate([m.points for m in meshes]).flatten('C')
        axes.auto_scale_xyz(scale, scale, scale)

        # Show the plot to the screen
        pyplot.show()

    def test(self):
        img = self.load_depth_img()
        img = self.downsample(img)
        img = self.remove_outliers(img)
        img = self.normalize(img)
        faces = self.create_tile_faces(img)
        tf_mesh = mesh.Mesh(faces.copy())
        self.render_meshes([tf_mesh])

if __name__ == '__main__':
    mb = MeshBuilder()
    mb.test()

