import cv2, cmd
import numpy as np
from scipy.spatial.distance import euclidean as dist

class Camera:
    def __init__(self):
        self.PROJ_SCREEN_SIZE_HW = (720, 1280)
        self.CM_TO_PX = 37.7952755906
        self.MIN_CONTOUR_LEN = 100
        self.path = 'test_images/form.png'
        self.img_orig = cv2.imread(self.path)
        self.contours = []
        self.work_env_contour = None
        self.video_capture = cv2.VideoCapture(0)
        self.video_preview_open = False

    def _process_image(self, img):
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img = cv2.GaussianBlur(img, (11, 11), 1, 1)
        # _, img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)
        img = cv2.Canny(img, 50, 80)
        return img

    def _load_file_image(self):
        return cv2.imread(self.path)

    def _read_video_image(self):
        ret, frame = self.video_capture.read()
        return frame

    def open_video_preview(self):
        self.video_preview_open = True
        cv2.imshow('preview', self._read_video_image())

    def update_video_preview(self):
        img = self._read_video_image()
        img_edge = self._process_image(img)
        contours = calc_contours(img_edge)
        try:
            work_env_contour = find_work_env_in_contours(contours)
            cv2.drawContours(img, [work_env_contour], -1, (0, 255, 0), 3)
        except ValueError:
            pass
        cv2.imshow('preview', img)

    def close_video_preview(self):
        self.video_preview_open = False
        cv2.destroyWindow('preview')

    def calc_candidate_contours(self, envelope_hw):
        # img = self._read_video_image()
        img = self._load_file_image()
        img = self._process_image(img)
        contours = calc_contours(img)
        work_env_contour = find_work_env_in_contours(contours)
        envelope_hw_px = (round(envelope_hw[0] * self.CM_TO_PX),\
                          round(envelope_hw[1] * self.CM_TO_PX))
        # TODO: this works with img_orig but we shouldn't be using it
        work_env_homog = calc_work_env_homog(self.img_orig, work_env_contour,\
                                             envelope_hw_px)
        decimated_contours = decimate_contours(contours)
        # Not sure whether/how closed=T/F matters here
        min_length_lambda = lambda c: cv2.arcLength(c, closed=True)\
                            > self.MIN_CONTOUR_LEN
        culled_contours = list(filter(min_length_lambda, decimated_contours))
        trans_contours = list(map(lambda c: transform_contour_with_h(c,\
                                work_env_homog), culled_contours))
        self.contours = trans_contours
        self.work_env_contour = work_env_contour

    @property
    def candidate_contours(self):
        return self.contours

class Interpreter(cmd.Cmd):
    def __init__(self):
        self.camera = Camera()

    def do_image(self, arg):
        pass

    def do_find_contours(self, arg):
        pass

    def do_project_select_contours(self,arg):
        pass

def main():
    pass

if __name__ == '__main__':
    main()

