/* HELPER FUNCTIONS ------------------------- */

let by_id = (id) => document.getElementById(id);
let by_class = (class_name) => document.getElementsByClassName(class_name);

// let css_display_off = (obj) => { if (obj != null) return obj.style.display = "none" }
// let css_display_on = (obj) => { if (obj != null) return obj.style.display = "block" }

let css_display_off = (obj) => {
   if (obj != null) {
      if (Array.isArray(obj)) obj.forEach(el => el.style.display = "none");
      else obj.style.display = "none";
   }
}

let css_display_on = (obj, type="block") => {
   if (obj != null) {
      if (Array.isArray(obj)) obj.forEach(el => el.style.display = type);
      else obj.style.display = type;
   }
};

let tool_off = (btn, dialog) => {
   btn.classList.replace("tool-btn-on", "tool-btn-off");
   css_display_off(dialog);
}

/* GLOBAL DOM ELEMENTS  --------------------- */

let main_ui = by_id("main");
let dialog = new Dialog();

let create_btn = by_id("create-btn");
let measure_btn = by_id("measure-btn");
let instr_btn = by_id("instr-btn");

let obj_list = by_id("objectlist");

let create_dlg = by_id("create-dialog");
let measure_dlg = by_id("measure-dialog");
let instr_dlg = by_id("instr-dialog");

// let work_env_dlg = by_id("work-env-dialog");
let work_env_dlg = by_id("work-env-dialog");
let prop_list = by_id("prop-list");

let lego_db = {
   "work-env-obj" : 0,
   "servo-obj" : 0,
   "enclosure-obj" : 0,
   "motor-obj" : 0,
   "circ-obj" : 0,
   "stab-obj" : 0
}

/* 
JSON syntax: 
"d": dropdown
"n": integer text field
*/

let lego_prop = {
   "work-env-obj" : {
      "Name" : "Work Environment",
      "Data" : [
         [ { "Type": ["2D", "3D", "Custom"] }, { "Shape": ["Circle","Rectangle","Polygon", "Sphere", "Cylinder", "Box"] } ],
         [ { "Plane": ["XY", "YZ", "XZ"] }, { "Direction": ["+", "-"] } ],
         [ { "Radius" : "n" }, {"Height" : "n" } ],
         [ { "X&#8202" : "n" }, { "Y&#8202" : "n" }, { "Z&#8202" : "n" } ]
      ]
   },
   
   "motor-obj" : {
      "Name" : "Motor Stage",
      "Data" : [
         [ { "Plane": ["XY", "YZ", "XZ"] }, { "Direction": ["+", "-"] } ],
         [ { "Length" : "n" }, { "Width" : "n" }, { "Height" : "n" }],
         [ { "X&#8202" : "n" }, { "Y&#8202" : "n" }, { "Z&#8202" : "n" } ]
      ]
   },

   "servo-obj" : 0,
   "enclosure-obj" : 0,
   "circ-obj" : 0,
   "stab-obj" : 0
}