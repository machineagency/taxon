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
        # contours = calc_contours(img_edge)
        # try:
        #     work_env_contour = find_work_env_in_contours(contours)
        #     cv2.drawContours(img, [work_env_contour], -1, (0, 255, 0), 3)
        # except ValueError:
        #     pass
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
    def __init__(self, use_prompt=False):
        cmd.Cmd.__init__(self)
        self.PROJ_SCREEN_SIZE_HW = (720, 1280)
        self.PROJ_NAME = 'projection'
        cv2.namedWindow(self.PROJ_NAME, cv2.WND_PROP_FULLSCREEN)

        Interpreter.intro = "Welcome to the interpreter."
        if use_prompt:
            Interpreter.prompt = "> "
        else:
            Interpreter.prompt = ""
        self.camera = Camera()

    def do_image(self, arg):
        if self.camera.video_preview_open:
            self.camera.update_video_preview()
        else:
            self.camera.open_video_preview()
        while True:
            # NOTE: Seems to receive buffered key presses from the interpreter
            # which causes premature firing sometimes. Not sure how to
            # fix this, adding delay does't seem to help.
            maybe_key = cv2.waitKey(100)
            if maybe_key > 0:
                self.camera.close_video_preview()
                cv2.waitKey(1)
                break

    def do_choose_point(self, arg):
        click_xy = None
        def proj_handle_click(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                nonlocal click_xy
                click_xy = (x, y)

        cv2.setMouseCallback(self.PROJ_NAME, proj_handle_click)
        choose_point_proj = np.zeros(self.PROJ_SCREEN_SIZE_HW)
        cv2.imshow(self.PROJ_NAME, choose_point_proj)
        while True:
            cv2.waitKey(100)
            if click_xy:
                cv2.destroyWindow(self.PROJ_NAME)
                cv2.waitKey(1)
                print(click_xy)
                break

    def do_find_contours(self, arg):
        pass

    def do_project_select_contours(self,arg):
        pass

    def do_bye(self, arg):
        print("Bye!")
        return True

    def do_EOF(self, arg):
        return True

def main():
    Interpreter().cmdloop();

if __name__ == '__main__':
    main()

