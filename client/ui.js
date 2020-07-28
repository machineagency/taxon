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

function select_object(obj) {
   dialog.updateFields(obj.id, true);
   dialog.showDialog();
   css_display_off(create_dlg);

   // Swtich statement for creating object using three.js
   // switch(obj.id) {
   //    case "work-env-obj":
   //       dialog.updateFields("work-env-obj");
   //       dialog.showDialog();
   //       css_display_off(create_dlg);
   //       break;
   //    case "motor-obj":
   //       dialog.updateFields("motor-obj");
   //       dialog.showDialog();
   //       css_display_off(create_dlg);
   //       break;
   // }
   
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
         tool_off(create_btn, create_dlg);
         break;

      case "work-env-dialog":
         tool_off(create_btn, work_env_dlg);
         // Delete object from object list
         break;
   }
}



// main_ui.appendChild();


// `<div class="dialog dialog-right prop-dialog" id="work-env-dialog">

//    <div class="dialog-header">

//       <div class="left-header">
//          <button type="button" class="back-btn" onclick="nav_back(this.parentElement.parentElement.parentElement)">
//             <img src="./icons/back.svg" alt="Back Button">
//          </button>
//          <h2 id="dialog-title">Work Environment</h2>
//       </div>

//       <div class="right-header">
//          <button type="button" class="x-btn" onclick="close_dialog(this.parentElement.parentElement.parentElement)">
//             <img src="./icons/x.svg" alt="Close Button">
//          </button>
//       </div>

//    </div>

//    <div class="line" id="dialog-topline"></div>

//    <div class="dialog-main prop-list">
      
//    </div>

//    <div class="line"></div>

//    <div class="dialog-footer">
//       <button type="button" class="prop-item-50 btn-secondary">Cancel</button>
//       <button type="button" class="prop-item-50 btn-primary">Save</button>
//    </div>
// </div> `