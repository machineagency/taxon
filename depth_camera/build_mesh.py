import numpy as np
from skimage.measure import block_reduce
import sys
from stl import mesh
from matplotlib import pyplot
from mpl_toolkits import mplot3d

class MeshBuilder:
    def __init__(self):
        self.DOWNSAMPLE_FACTOR = 64

    def load_depth_img(self):
        """
        Loads an .npy file of a depth image.
        Returns a NumPy array.
        """
        return np.load('sample_img.npy')

    def downsample(self, img):
        f = self.DOWNSAMPLE_FACTOR
        return block_reduce(img, block_size=(f, f), func=np.mean)

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

    def invert(self, img):
        return np.max(img) - img

    def create_tile_faces(self, m_tile, is_floor=False):
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
                if is_floor:
                    tile_depth = 0
                else:
                    tile_depth = m_tile[y, x]
                v_nw = [y - 0.5, x - 0.5, tile_depth]
                v_ne = [y + 0.5, x - 0.5, tile_depth]
                v_se = [y + 0.5, x + 0.5, tile_depth]
                v_sw = [y - 0.5, x + 0.5, tile_depth]
                data['vectors'][i] = np.array([v_nw, v_ne, v_sw])
                data['vectors'][i + 1] = np.array([v_ne, v_sw, v_se])
                i += 2
        return data

    def create_wall_faces(self, m_tile):
        # NOTE: x,y and height,width are flipped because I am bad at counting
        wall_list = []
        m_tile_height, m_tile_width = m_tile.shape
        for _y in range(m_tile_height):
            for _x in range(m_tile_width):
                x, y = _y, _x
                # North
                if y > 0 and m_tile[x, y] > m_tile[x, y - 1]:
                    wall_list.append(self.wall((x, y), (x, y - 1), m_tile))
                elif y == 0:
                    wall_list.append(self.wall((x, y), (x, y - 1), m_tile, 'north'))
                # East
                if x < m_tile_height - 1 and m_tile[x, y] > m_tile[x + 1, y]:
                    wall_list.append(self.wall((x, y), (x + 1, y), m_tile))
                elif x == m_tile_height - 1:
                    wall_list.append(self.wall((x, y), (x + 1, y), m_tile, 'east'))
                # South
                if y < m_tile_width - 1 and m_tile[x, y] > m_tile[x, y + 1]:
                    wall_list.append(self.wall((x, y), (x, y + 1), m_tile))
                elif y == m_tile_width - 1:
                    wall_list.append(self.wall((x, y), (x, y + 1), m_tile, 'south'))
                # West
                if x > 0 and m_tile[x, y] > m_tile[x - 1, y]:
                    wall_list.append(self.wall((x, y), (x - 1, y), m_tile))
                elif x == 0:
                    wall_list.append(self.wall((x, y), (x - 1, y), m_tile, 'west'))
        data = np.zeros(len(wall_list) * 2, dtype=mesh.Mesh.dtype)
        data['vectors'] = np.array(wall_list)\
                            .reshape((len(wall_list) * 2, 3, 3))
        return data

    def wall(self, idx_tile_from, idx_tile_to, m_tile, edge=''):
        """
        Only make if FROM is higher than TO.
        """
        x_from, y_from = idx_tile_from
        if edge == '':
            x_to, y_to = idx_tile_to
        elif edge == 'east':
            x_to, y_to = x_from + 1, y_from
        elif edge == 'west':
            x_to, y_to = x_from - 1, y_from
        elif edge == 'north':
            x_to, y_to = x_from, y_from - 1
        elif edge == 'south':
            x_to, y_to = x_from, y_from + 1
        z_high = m_tile[x_from, y_from]
        if edge == '':
            z_low = m_tile[x_to, y_to]
        else:
            z_low = 0
        # East and West cases
        if y_from == y_to:
            v_tl = [(x_from + x_to) * 0.5, y_from - 0.5, z_high]
            v_tr = [(x_from + x_to) * 0.5, y_from + 0.5, z_high]
            v_bl = [(x_from + x_to) * 0.5, y_from - 0.5, z_low]
            v_br = [(x_from + x_to) * 0.5, y_from + 0.5, z_low]
        # North and South cases
        else:
            v_tl = [x_from - 0.5, (y_from + y_to) * 0.5, z_high]
            v_tr = [x_from + 0.5, (y_from + y_to) * 0.5, z_high]
            v_bl = [x_from - 0.5, (y_from + y_to) * 0.5, z_low]
            v_br = [x_from + 0.5, (y_from + y_to) * 0.5, z_low]
        face_tl = np.array([v_tl, v_tr, v_bl])
        face_br = np.array([v_tr, v_bl, v_br])
        return (face_tl, face_br)

    def combine_face_lists_into_mesh(self, face_lists):
        """
        Not a boolean operation, just throws all the faces together.abs
        """
        all_faces = np.concatenate(face_lists)
        return mesh.Mesh(all_faces.copy())

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
        img = self.invert(img)
        tile_faces = self.create_tile_faces(img)
        wall_faces = self.create_wall_faces(img)
        floor_faces = self.create_tile_faces(img, is_floor=True)
        all_mesh = self.combine_face_lists_into_mesh([tile_faces, wall_faces,
                                                      floor_faces])
        self.render_meshes([all_mesh])

if __name__ == '__main__':
    mb = MeshBuilder()
    mb.test()

