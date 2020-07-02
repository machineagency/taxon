/* HELPER FUNCTIONS ------------------------- */

let by_id = (id) => document.getElementById(id);

let css_display_off = (obj) => { if (obj != null) return obj.style.display = "none" }
let css_display_on = (obj) => { if (obj != null) return obj.style.display = "block" }

let tool_off = (btn, dialog) => {
   btn.classList.replace("tool-btn-on", "tool-btn-off");
   css_display_off(dialog);
}


/* GLOBAL DOM ELEMENTS  --------------------- */

let create_btn = by_id("create-btn");
let measure_btn = by_id("measure-btn");
let instr_btn = by_id("instr-btn");

let obj_list = by_id("objectlist");

let create_dlg = by_id("create-dialog");
let measure_dlg = by_id("measure-dialog");
let instr_dlg = by_id("instr-dialog");

let work_env_dlg = by_id("work-env-dialog");

let lego_db = {
   "work-env-obj" : 0,
   "servo-obj" : 0,
   "enclosre-obj" : 0,
   "motor-obj" : 0,
   "circ-obj" : 0,
   "stab-obj" : 0
}

/* FUNCTIONS ------------------------------- */

function toggle_tool(btn) {
   let classes = btn.classList;
   let dialog_id = btn.id.replace("btn","dialog");
   let dialog = by_id(dialog_id);

   if ( classes.contains("tool-btn-on") ) {
      classes.replace("tool-btn-on", "tool-btn-off");
      css_display_off(dialog);

   } else {
      classes.replace("tool-btn-off", "tool-btn-on");
      css_display_on(dialog);

      switch(btn.id) {
         case "create-btn":
            tool_off(measure_btn, measure_dlg);
            tool_off(instr_btn, instr_dlg);
            break;

         case "measure-btn":
            tool_off(create_btn, create_dlg);
            tool_off(instr_btn, instr_dlg);
            break;

         case "instr-btn":
            tool_off(create_btn, create_dlg);
            tool_off(measure_btn, measure_dlg);
            break;
      }
   }
}

function add_object(obj) {

   // Swtich statement for creating object using three.js
   switch(obj.id) {
      case "work-env-obj":
         css_display_on(work_env_dlg);
         css_display_off(create_dlg);
         break;
   }

   let divider = document.createElement("div");
   divider.classList.add("line");

   let item = document.createElement("button");
   item.classList.add("list-item");
   item.type = "button";

   let desc = document.createElement("p");
   let index = ++lego_db[obj.id];
   desc.innerHTML = obj.lastElementChild.innerHTML + " " + index;
   item.appendChild(desc);

   obj_list.appendChild(divider);
   obj_list.appendChild(item);
   
}

function open_obj_property(lego) {

   // switch 

}

function nav_back(current) {
   css_display_off(current);
   css_display_on(create_dlg);
}

function close_dialog(obj) {
   let btn = obj.id.replace("dialog","btn");
   
   switch(obj.id) {
      case "create-dialog":
         toggle_tool(create_btn);
         break;
   }
}