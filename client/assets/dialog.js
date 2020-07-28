class Dialog {

   constructor() {
      this.dlg = document.createElement("div");
      this.dlg.classList.add("dialog", "dialog-right", "prop-dialog");
      this.dlg.setAttribute("id", "right-dialog");
      this.dlg.innerHTML =
         `<div class="dialog-header">

            <div class="left-header">
               <button type="button" class="back-btn" id="dlg-back-btn" onclick="nav_back(this.parentElement.parentElement.parentElement)">
                  <img src="./icons/back.svg" alt="Back Button">
               </button>
               <h2 id="dialog-title"></h2>
            </div>

            <div class="right-header">
               <button type="button" class="x-btn" onclick="close_dialog(this.parentElement.parentElement.parentElement)">
                  <img src="./icons/x.svg" alt="Close Button">
               </button>
            </div>

         </div>

         <div class="line" id="topline"></div>

         <div class="dialog-main prop-list" id="dialog-main"> </div>

         <div class="line" id="bottomline"></div>

         <div class="dialog-footer" id="dialog-footer">
            <button type="button" class="prop-item-50 dialog-btn btn-secondary" id="cancel-btn">Cancel</button>
            <button type="button" class="prop-item-50 dialog-btn btn-primary" id="create-btn">Create</button>
         </div>`;

      main_ui.appendChild(this.dlg);
      this.hideDialog();

      this.main = document.getElementById("dialog-main");
      this.title = document.getElementById("dialog-title");
      this.backbtn = document.getElementById("dlg-back-btn");
      this.bottomline = document.getElementById("bottomline");
      this.footer = document.getElementById("dialog-footer");

      this.createbtn = document.getElementById("create-btn");
      this.createbtn.addEventListener("click", () => {

      });
   }

   updateFields(type, show_btn = false) {
      this.main.innerHTML = "";

      let json_obj = lego_prop[type];
      this.dlg.setAttribute( "id", type.replace("obj","dialog") );
      this.title.innerHTML = json_obj["Name"];

      json_obj["Data"].forEach(prop_row => {
         
         let row = document.createElement("div");
         row.classList.add("prop-row");

         prop_row.forEach(item => { // for each row

            let row_item = document.createElement("div");
            row_item.classList.add("dropdown-container");
            if (prop_row.length == 2) {
               row_item.classList.add("prop-item-50");
            } else if (prop_row.length == 3) {
               row_item.classList.add("prop-item-33");
            }
            
            row_item.appendChild( this.createLabel(Object.keys(item)[0]) );

            let val = item[ Object.keys(item)[0] ];
            if (Array.isArray(val)) {
               this.createDropdown(row_item, val);
            } else if (val === "n") {
               this.createNumfield(row_item);
            }

            row.appendChild(row_item);
         });

         this.main.appendChild(row);
         console.log(row);
      });

      if (!show_btn) {
         css_display_off([this.backbtn, this.bottomline, this.footer]);
      } else {
         css_display_on([this.backbtn, this.bottomline]);
         css_display_on(this.footer, "flex");
      }
   }

   createLabel(name, row_item) {
      let label = document.createElement("label");
      label.classList.add("dropdown-label");
      label.innerHTML = name + ":";
      return label;
   }

   createDropdown(row_item, opts) {
      let options = document.createElement("select");
      // options.setAttribute("name", "work-env-type");
      opts.forEach( (option_content, index) => {
         let option = document.createElement("option");
         option.setAttribute("value", index+1+"");
         option.innerHTML = option_content;
         options.appendChild(option);
      });

      row_item.appendChild(options);
   }

   createNumfield(row_item) {
      let num_field = document.createElement("input");
      num_field.classList.add("prop-field");
      num_field.setAttribute("type", "text");

      row_item.appendChild(num_field);
   }

   hideDialog() { css_display_off(this.dlg) }
   showDialog() { css_display_on(this.dlg) }
}



// <div class="dialog dialog-right prop-dialog" id="work-env-dialog">

// 			<div class="dialog-header">

// 				<div class="left-header">
// 					<button type="button" class="back-btn" onclick="nav_back(this.parentElement.parentElement.parentElement)">
// 						<img src="./icons/back.svg" alt="Back Button">
// 					</button>
// 					<h2>Work Environment</h2>
// 				</div>

// 				<div class="right-header">
// 					<button type="button" class="x-btn" onclick="close_dialog(this.parentElement.parentElement.parentElement)">
// 						<img src="./icons/x.svg" alt="Close Button">
// 					</button>
// 				</div>

// 			</div>

// 			<div class="dialog-main prop-list">

// 				<div class="line"></div>

// 				<div class="prop-row dropdown-container">

// 					<label class="dropdown-label">Type:</label>

// 					<select name="work-env-type">
// 						<option value="0">2-Dimensional</option>
// 						<option value="1">3-Dimensional</option>
// 						<option value="2">Custom Object</option>
// 					</select>

// 				</div>

// 				<div class="prop-row">

// 					<div class="dropdown-container prop-item-66">
// 						<label class="dropdown-label">Shape:</label>
// 						<select name="work-env-shape">
// 							<option value="0">Rectangle</option>
// 							<option value="1">Circle</option>
// 							<option value="2">Triangle</option>
// 						</select>
// 					</div>

// 					<div class="dropdown-container prop-item-33">
// 						<label class="dropdown-label">Plane:</label>
// 						<select name="work-env-shape">
// 							<option value="0">XY</option>
// 							<option value="1">YZ</option>
// 							<option value="2">XZ</option>
// 						</select>
// 					</div>

// 				</div>

// 				<div class="prop-row">

// 					<div class="dropdown-container prop-item-50">
// 						<label class="dropdown-label">Length:</label>
// 						<input class="prop-field" type="text">
// 					</div>

// 					<div class="dropdown-container prop-item-50">
// 						<label class="dropdown-label">Width:</label>
// 						<input class="prop-field" type="text">
// 					</div>

// 				</div>

// 				<div class="line"></div>

// 			</div>

// 			<div class="dialog-footer">
// 				<button type="button" class="prop-item-50 btn-secondary">Cancel</button>
// 				<button type="button" class="prop-item-50 btn-primary">Save</button>
// 			</div>
// 		</div>


// 	</div>