

    // ----------------------- Backbone MODEL --------------------------------------------


    // ------------------------ Panel -----------------------------------------
    // Simple place-holder for each Panel. Will have E.g. imageId, rendering options etc
    // Attributes can be added as we need them.
    var Panel = Backbone.Model.extend({

        defaults: {
            x: 100,     // coordinates on the 'paper'
            y: 100,
            width: 512,
            height: 512,
            zoom: 100,
            dx: 0,    // pan x & y within viewport
            dy: 0,
            labels: [],
            deltaT: [],     // list of deltaTs (secs) for tIndexes of movie
            selected: false
        },

        initialize: function() {

        },

        syncOverride: true,

        // Switch some attributes for new image...
        setId: function(data) {

            // we replace these attributes...
            var newData = {'imageId': data.imageId,
                'name': data.name,
                'sizeZ': data.sizeZ,
                'theZ': data.theZ,
                'sizeT': data.sizeT,
                'orig_width': data.orig_width,
                'orig_height': data.orig_height,
                'datasetName': data.datasetName,
                'pixel_size_x': data.pixel_size_x,
                'pixel_size_y': data.pixel_size_y,
                'deltaT': data.deltaT,
            };

            // theT is not changed unless we have to...
            if (this.get('theT') >= newData.sizeT) {
                newData.theT = newData.sizeT - 1;
            }

            // new Channels are based on new data, but we keep the
            // 'active' state and color from old Channels.
            var newCh = [],
                oldCh = this.get('channels'),
                dataCh = data.channels;
            _.each(dataCh, function(ch, i) {
                var nc = $.extend(true, {}, dataCh[i]);
                nc.active = (i < oldCh.length && oldCh[i].active);
                if (i < oldCh.length) {
                    nc.color = "" + oldCh[i].color;
                }
                newCh.push(nc);
            });

            newData.channels = newCh;

            this.set(newData);
        },

        hide_scalebar: function() {
            // keep all scalebar properties, except 'show'
            var sb = $.extend(true, {}, this.get('scalebar'));
            sb.show = false;
            this.save('scalebar', sb);
        },

        save_scalebar: function(new_sb) {
            // update only the attributes of scalebar we're passed
            var old_sb = $.extend(true, {}, this.get('scalebar') || {});
            var sb = $.extend(true, old_sb, new_sb);
            this.save('scalebar', sb);
        },

        // takes a list of labels, E.g [{'text':"t", 'size':10, 'color':'FF0000', 'position':"top"}]
        add_labels: function(labels) {
            var oldLabs = this.get("labels");
            // Need to clone the list of labels...
            var labs = [];
            for (var i=0; i<oldLabs.length; i++) {
                labs.push( $.extend(true, {}, oldLabs[i]) );
            }
            // ... then add new labels ...
            for (var j=0; j<labels.length; j++) {
                // check that we're not adding a white label outside panel (on a white background)
                if (_.contains(["top", "bottom", "left", "right"], labels[j].position) &&
                        labels[j].color == "FFFFFF") {
                    labels[j].color = "000000";
                }
                labs.push( $.extend(true, {}, labels[j]) );
            }
            // ... so that we get the changed event triggering OK
            this.save('labels', labs);
        },

        create_labels_from_channels: function(options) {
            var newLabels = [];
            _.each(this.get('channels'), function(c){
                if (c.active) {
                    newLabels.push({
                        'text': c.label,
                        'size': options.size,
                        'position': options.position,
                        'color': options.color || c.color
                    });
                }
            });
            this.add_labels(newLabels);
        },

        get_time_label_text: function(format) {
            var pad = function(digit) {
                var d = digit + "";
                return d.length === 1 ? ("0"+d) : d;
            };
            var theT = this.get('theT'),
                deltaT = this.get('deltaT')[theT] || 0,
                text = "", h, m, s;
            if (format === "secs") {
                text = deltaT + " secs";
            } else if (format === "mins") {
                text = Math.round(deltaT / 60) + "mins";
            } else if (format === "hrs:mins") {
                h = (deltaT / 3600) >> 0;
                m = pad(Math.round((deltaT % 3600) / 60));
                text = h + ":" + m;
            } else if (format === "hrs:mins:secs") {
                h = (deltaT / 3600) >> 0;
                m = pad(((deltaT % 3600) / 60) >> 0);
                s = pad(deltaT % 60);
                text = h + ":" + m + ":" + s;
            }
            return text;
        },

        create_labels_from_time: function(options) {
            
            this.add_labels([{
                    'time': options.format,
                    'size': options.size,
                    'position': options.position,
                    'color': options.color
            }]);
        },

        get_label_key: function(label) {
            return label.text + '_' + label.size + '_' + label.color + '_' + label.position;
        },

        // labels_map is {labelKey: {size:s, text:t, position:p, color:c}} or {labelKey: false} to delete
        // where labelKey specifies the label to edit. "l.text + '_' + l.size + '_' + l.color + '_' + l.position"
        edit_labels: function(labels_map) {

            var oldLabs = this.get('labels');
            // Need to clone the list of labels...
            var labs = [],
                lbl, lbl_key;
            for (var i=0; i<oldLabs.length; i++) {
                lbl = oldLabs[i];
                lbl_key = this.get_label_key(lbl);
                // for existing label that matches...
                if (labels_map.hasOwnProperty(lbl_key)) {
                    if (labels_map[lbl_key]) {
                        // replace with the new label
                        lbl = $.extend(true, {}, labels_map[lbl_key]);
                        labs.push( lbl );
                    }
                    // else 'false' are ignored (deleted)
                } else {
                    // otherwise leave un-edited
                    lbl = $.extend(true, {}, lbl);
                    labs.push( lbl );
                }
            }
            // ... so that we get the changed event triggering OK
            this.save('labels', labs);
        },

        save_channel: function(cIndex, attr, value) {

            var oldChs = this.get('channels');
            // Need to clone the list of channels...
            var chs = [];
            for (var i=0; i<oldChs.length; i++) {
                chs.push( $.extend(true, {}, oldChs[i]) );
            }
            // ... then set new value ...
            chs[cIndex][attr] = value;
            // ... so that we get the changed event triggering OK
            this.save('channels', chs);
        },

        toggle_channel: function(cIndex, active){

            if (typeof active == "undefined"){
                active = !this.get('channels')[cIndex].active;
            }
            this.save_channel(cIndex, 'active', active);
        },

        save_channel_window: function(cIndex, new_w) {
            // save changes to the channel.window. Extend {} so save triggers change
            var w = $.extend(true, {}, this.get('channels')[cIndex].window);
            new_w = $.extend(true, w, new_w);
            this.save_channel(cIndex, 'window', new_w);
        },

        // When a multi-select rectangle is drawn around several Panels
        // a resize of the rectangle x1, y1, w1, h1 => x2, y2, w2, h2
        // will resize the Panels within it in proportion.
        // This might be during a drag, or drag-stop (save=true)
        multiselectdrag: function(x1, y1, w1, h1, x2, y2, w2, h2, save){

            var shift_x = function(startX) {
                return ((startX - x1)/w1) * w2 + x2;
            };
            var shift_y = function(startY) {
                return ((startY - y1)/h1) * h2 + y2;
            };

            var newX = shift_x( this.get('x') ),
                newY = shift_y( this.get('y') ),
                newW = shift_x( this.get('x')+this.get('width') ) - newX,
                newH = shift_y( this.get('y')+this.get('height') ) - newY;

            // Either set the new coordinates...
            if (save) {
                this.save( {'x':newX, 'y':newY, 'width':newW, 'height':newH} );
            } else {
                // ... Or update the UI Panels
                // both svg and DOM views listen for this...
                this.trigger('drag_resize', [newX, newY, newW, newH] );
            }
        },

        // Drag resizing - notify the PanelView without saving
        drag_resize: function(x, y, w, h) {
            this.trigger('drag_resize', [x, y, w, h] );
        },

        // Drag moving - notify the PanelView & SvgModel with/without saving
        drag_xy: function(dx, dy, save) {
            // Ignore any drag_stop events from simple clicks (no drag)
            if (dx === 0 && dy === 0) {
                return;
            }
            var newX = this.get('x') + dx,
                newY = this.get('y') + dy,
                w = this.get('width'),
                h = this.get('height');

            // Either set the new coordinates...
            if (save) {
                this.save( {'x':newX, 'y':newY} );
            } else {
                // ... Or update the UI Panels
                // both svg and DOM views listen for this...
                this.trigger('drag_resize', [newX, newY, w, h] );
            }

            // we return new X and Y so FigureModel knows where panels are
            return {'x':newX, 'y':newY};
        },

        get_centre: function() {
            return {'x':this.get('x') + (this.get('width')/2),
                'y':this.get('y') + (this.get('height')/2)};
        },

        get_img_src: function() {
            var cStrings = [];
            _.each(this.get('channels'), function(c, i){
                if (c.active) {
                    cStrings.push(1+i + "|" + c.window.start + ":" + c.window.end + "$" + c.color);
                }
            });
            var renderString = cStrings.join(","),
                imageId = this.get('imageId'),
                theZ = this.get('theZ'),
                theT = this.get('theT');

            return '/webgateway/render_image/' + imageId +
                    "/" + theZ + "/" + theT + '/?c=' + renderString + "&m=c";
        },

        // used by the PanelView and ImageViewerView to get the size and
        // offset of the img within it's frame
        get_vp_img_css: function(zoom, frame_w, frame_h, dx, dy, fit) {

            var orig_w = this.get('orig_width'),
                orig_h = this.get('orig_height');
            if (typeof dx == 'undefined') dx = this.get('dx');
            if (typeof dy == 'undefined') dy = this.get('dy');
            zoom = zoom || 100;

            var img_x = 0,
                img_y = 0,
                img_w = frame_w * (zoom/100),
                img_h = frame_h * (zoom/100),
                orig_ratio = orig_w / orig_h,
                wh = frame_w / frame_h;
            if (Math.abs(orig_ratio - wh) < 0.01) {
                // ignore...
            // if viewport is wider than orig, offset y
            } else if (orig_ratio < wh) {
                img_h = img_w / orig_ratio;
            } else {
                img_w = img_h * orig_ratio;
            }
            // offsets if image is centered
            img_y = (img_h - frame_h)/2;
            img_x = (img_w - frame_w)/2;

            // now shift by dx & dy
            dx = dx * (zoom/100);
            dy = dy * (zoom/100);
            img_x = ((dx * frame_w) / orig_w) - img_x;
            img_y = ((dy * frame_h) / orig_h) - img_y;

            // option to align image within viewport (not used now)
            if (fit) {
                img_x = Math.min(img_x, 0);
                if (img_x + img_w < frame_w) {
                    img_x = frame_w - img_w;
                }
                img_y = Math.min(img_y, 0);
                if (img_y + img_h < frame_h) {
                    img_y = frame_h - img_h;
                }
            }

            return {'left':img_x, 'top':img_y, 'width':img_w, 'height':img_h};
        },

        // True if coords (x,y,width, height) overlap with panel
        regionOverlaps: function(coords) {

            var px = this.get('x'),
                px2 = px + this.get('width'),
                py = this.get('y'),
                py2 = py + this.get('height'),
                cx = coords.x,
                cx2 = cx + coords.width,
                cy = coords.y,
                cy2 = cy + coords.height;
            // overlap needs overlap on x-axis...
            return ((px < cx2) && (cx < px2) && (py < cy2) && (cy < py2));
        },

    });

    // ------------------------ Panel Collection -------------------------
    var PanelList = Backbone.Collection.extend({
        model: Panel,

        getSelected: function() {
            return this.filter(function(panel){
                return panel.get('selected');
            });
        },

        // localStorage: new Backbone.LocalStorage("figureShop-backbone")
    });


    // ------------------------- Figure Model -----------------------------------
    // Has a PanelList as well as other attributes of the Figure
    var FigureModel = Backbone.Model.extend({

        defaults: {
            'curr_zoom': 100,
            'unsaved': false,
        },

        initialize: function() {
            this.panels = new PanelList();      //this.get("shapes"));

            // wrap selection notification in a 'debounce', so that many rapid
            // selection changes only trigger a single re-rendering 
            this.notifySelectionChange = _.debounce( this.notifySelectionChange, 10);
        },

        syncOverride: function(method, model, options, error) {
            this.set("unsaved", true);
        },

        load_from_OMERO: function(fileId, success) {

            var load_url = BASE_WEBFIGURE_URL + "load_web_figure/" + fileId + "/",
                self = this;


            $.getJSON(load_url, function(data){

                // bring older files up-to-date
                data = self.version_transform(data);

                _.each(data.panels, function(p){
                    p.selected = false;
                    self.panels.create(p);
                });

                var name = data.figureName || "UN-NAMED";

                self.set({'fileId': fileId,
                        'unsaved': false,
                        'figureName': name,
                        'canEdit': data.canEdit
                    });
                self.trigger("reset_undo_redo");
            });
        },

        // take Figure_JSON from a previous version,
        // and transform it to latest version
        version_transform: function(json) {
            var v = json.version || 0;

            // In version 1, we have pixel_size_x and y.
            // Earlier versions only have pixel_size.
            if (v < 1) {
                _.each(json.panels, function(p){
                    var ps = p.pixel_size;
                    p.pixel_size_x = ps;
                    p.pixel_size_y = ps;
                    delete p.pixel_size;
                });
            }

            return json;
        },

        figure_toJSON: function() {
            // Turn panels into json
            var p_json = [],
                self = this;
            this.panels.each(function(m) {
                p_json.push(m.toJSON());
            });

            var figureJSON = {
                version: 1,
                panels: p_json,
                paper_width: this.get('paper_width'),
                paper_height: this.get('paper_height'),
            };
            return figureJSON;
        },

        save_to_OMERO: function(options, success) {

            var self = this,
                figureJSON = this.figure_toJSON();

            var url = window.SAVE_WEBFIGURE_URL,
                data = options || {};

            if (options.fileId) {
                data.fileId = options.fileId;
            }
            data.figureJSON = JSON.stringify(figureJSON);

            // Save
            $.post( url, data)
                .done(function( data ) {
                    var update = {
                        'fileId': +data,
                        'unsaved': false,
                    };
                    if (options.figureName) {
                        update.figureName = options.figureName;
                    }
                    self.set(update);

                    if (success) {
                        success(data);
                    }
                });
        },

        nudge_right: function() {
            this.nudge('x', 10);
        },

        nudge_left: function() {
            this.nudge('x', -10);
        },

        nudge_down: function() {
            this.nudge('y', 10);
        },

        nudge_up: function() {
            this.nudge('y', -10);
        },

        nudge: function(axis, delta) {
            var selected = this.getSelected(),
                pos;

            for (var j=0; j<selected.length; j++) {
                pos = selected[j].get(axis);
                selected[j].set(axis, pos + delta);
            }
        },

        align_left: function() {
            var selected = this.getSelected(),
                x_vals = [];
            for (var i=0; i<selected.length; i++) {
                x_vals.push(selected[i].get('x'));
            }
            var min_x = Math.min.apply(window, x_vals);

            for (var j=0; j<selected.length; j++) {
                selected[j].set('x', min_x);
            }
        },

        align_top: function() {
            var selected = this.getSelected(),
                y_vals = [];
            for (var i=0; i<selected.length; i++) {
                y_vals.push(selected[i].get('y'));
            }
            var min_y = Math.min.apply(window, y_vals);

            for (var j=0; j<selected.length; j++) {
                selected[j].set('y', min_y);
            }
        },

        align_grid: function() {
            var sel = this.getSelected(),
                top_left = this.get_top_left_panel(sel),
                top_x = top_left.get('x'),
                top_y = top_left.get('y'),
                grid = [],
                row = [top_left],
                next_panel = top_left;

            // populate the grid, getting neighbouring panel each time
            while (next_panel) {
                c = next_panel.get_centre();
                next_panel = this.get_panel_at(c.x + next_panel.get('width'), c.y, sel);

                // if next_panel is not found, reached end of row. Try start new row...
                if (typeof next_panel == 'undefined') {
                    grid.push(row);
                    // next_panel is below the first of the current row
                    c = row[0].get_centre();
                    next_panel = this.get_panel_at(c.x, c.y + row[0].get('height'), sel);
                    row = [];
                }
                if (next_panel) {
                    row.push(next_panel);
                }
            }

            var spacer = top_left.get('width')/20,
                new_x = top_x,
                new_y = top_y,
                max_h = 0;
            for (var r=0; r<grid.length; r++) {
                row = grid[r];
                for (var c=0; c<row.length; c++) {
                    panel = row[c];
                    panel.save({'x':new_x, 'y':new_y});
                    max_h = Math.max(max_h, panel.get('height'));
                    new_x = new_x + spacer + panel.get('width');
                }
                new_y = new_y + spacer + max_h;
                new_x = top_x;
            }
        },

        get_panel_at: function(x, y, panels) {
            for(var i=0; i<panels.length; i++) {
                p = panels[i];
                if ((p.get('x') < x && (p.get('x')+p.get('width')) > x) &&
                        (p.get('y') < y && (p.get('y')+p.get('height')) > y)) {
                    return p;
                }
            }
        },

        get_top_left_panel: function(panels) {
            // top-left panel is one where x + y is least
            var p, top_left;
            for(var i=0; i<panels.length; i++) {
                p = panels[i];
                if (i === 0) {
                    top_left = p;
                } else {
                    if ((p.get('x') + p.get('y')) < (top_left.get('x') + top_left.get('y'))) {
                        top_left = p;
                    }
                }
            }
            return top_left;
        },

        align_size: function(width, height) {
            var sel = this.getSelected(),
                ref = this.get_top_left_panel(sel),
                ref_width = width ? ref.get('width') : false,
                ref_height = height ? ref.get('height') : false,
                new_w, new_h,
                p;

            for (var i=0; i<sel.length; i++) {
                p = sel[i];
                if (ref_width && ref_height) {
                    new_w = ref_width;
                    new_h = ref_height;
                } else if (ref_width) {
                    new_w = ref_width;
                    new_h = (ref_width/p.get('width')) * p.get('height');
                } else if (ref_height) {
                    new_h = ref_height;
                    new_w = (ref_height/p.get('height')) * p.get('width');
                }
                p.save({'width':new_w, 'height':new_h});
            }
        },

        // This can come from multi-select Rect OR any selected Panel
        // Need to notify ALL panels and Multi-select Rect.
        drag_xy: function(dx, dy, save) {
            if (dx === 0 && dy === 0) return;

            var minX = 10000,
                minY = 10000,
                xy;
            // First we notidy all Panels
            var selected = this.getSelected();
            for (var i=0; i<selected.length; i++) {
                xy = selected[i].drag_xy(dx, dy, save);
                minX = Math.min(minX, xy.x);
                minY = Math.min(minY, xy.y);
            }
            // Notify the Multi-select Rect of it's new X and Y
            this.trigger('drag_xy', [minX, minY, save]);
        },


        // This comes from the Multi-Select Rect.
        // Simply delegate to all the Panels
        multiselectdrag: function(x1, y1, w1, h1, x2, y2, w2, h2, save) {
            var selected = this.getSelected();
            for (var i=0; i<selected.length; i++) {
                selected[i].multiselectdrag(x1, y1, w1, h1, x2, y2, w2, h2, save);
            }
        },

        // If already selected, do nothing (unless clearOthers is true)
        setSelected: function(item, clearOthers) {
            if ((!item.get('selected')) || clearOthers) {
                this.clearSelected(false);
                item.set('selected', true);
                this.notifySelectionChange();
            }
        },

        select_all:function() {
            this.panels.each(function(p){
                p.set('selected', true);
            });
            this.notifySelectionChange();
        },

        addSelected: function(item) {
            item.set('selected', true);
            this.notifySelectionChange();
        },

        clearSelected: function(trigger) {
            this.panels.each(function(p){
                p.set('selected', false);
            });
            if (trigger !== false) {
                this.notifySelectionChange();
            }
        },

        selectByRegion: function(coords) {
            this.panels.each(function(p){
                if (p.regionOverlaps(coords)) {
                    p.set('selected', true);
                }
            });
            this.notifySelectionChange();
        },

        getSelected: function() {
            return this.panels.getSelected();
        },

        // Go through all selected and destroy them - trigger selection change
        deleteSelected: function() {
            var selected = this.getSelected();
            for (var i=0; i<selected.length; i++) {
                selected[i].destroy();
            }
            this.notifySelectionChange();
        },

        delete_all: function() {
            // make list that won't change as we destroy
            var ps = [];
            this.panels.each(function(p){
                ps.push(p);
            });
            for (var i=ps.length-1; i>=0; i--) {
                ps[i].destroy();
            }
            this.notifySelectionChange();
        },

        notifySelectionChange: function() {
            this.trigger('change:selection');
        }

    });


    // -------------------------- Backbone VIEWS -----------------------------------------


    // var SelectionView = Backbone.View.extend({
    var FigureView = Backbone.View.extend({

        el: $("#body"),

        initialize: function(opts) {

            // Delegate some responsibility to other views
            new AlignmentToolbarView({model: this.model});
            new AddImagesModalView({model: this.model, figureView: this});
            new SetIdModalView({model: this.model});

            this.figureFiles = new FileList();
            new FileListView({model:this.figureFiles});

            // set up various elements and we need repeatedly
            this.$main = $('main');
            this.$canvas = $("#canvas");
            this.$canvas_wrapper = $("#canvas_wrapper");
            this.$paper = $("#paper");
            this.$copyBtn = $(".copy");
            this.$pasteBtn = $(".paste");
            this.$saveBtn = $(".save_figure.btn");
            this.$saveOption = $("li.save_figure");
            this.$saveAsOption = $("li.save_as");
            this.$deleteOption = $("li.delete_figure");

            var self = this;

            // Render on changes to the model
            this.model.on('change:paper_width', this.render, this);

            // If a panel is added...
            this.model.panels.on("add", this.addOne, this);

            // Select a different size paper
            $("#paper_size_chooser").change(function(){
                var wh = $(this).val().split(","),
                    w = wh[0],
                    h = wh[1];
                self.model.set({'paper_width':w, 'paper_height':h});
            });

            // Don't leave the page with unsaved changes!
            window.onbeforeunload = function() {
                var canEdit = self.model.get('canEdit');
                if (typeof canEdit === 'undefined') canEdit = true;
                if (self.model.get("unsaved") && canEdit) {
                    return "Leave page with unsaved changes?";
                }
            };

            $("#zoom_slider").slider({
                max: 400,
                min: 40,
                value: 75,
                slide: function(event, ui) {
                    self.model.set('curr_zoom', ui.value);
                }
            });

            // respond to zoom changes
            this.listenTo(this.model, 'change:curr_zoom', this.renderZoom);
            this.listenTo(this.model, 'change:selection', this.renderSelectionChange);
            this.listenTo(this.model, 'change:unsaved', this.renderSaveBtn);
            this.listenTo(this.model, 'change:figureName', this.renderFigureName);

            // refresh current UI
            this.renderZoom();
            this.zoom_paper_to_fit();

            // 'Auto-render' on init.
            this.render();
            this.renderSelectionChange();

        },

        events: {
            "click .export_pdf": "export_pdf",
            "click .add_panel": "addPanel",
            "click .delete_panel": "deleteSelectedPanels",
            "click .copy": "copy_selected_panels",
            "click .paste": "paste_panels",
            "click .save_figure": "save_figure",
            "click .save_as": "save_as",
            "click .new_figure": "goto_newfigure",
            "click .open_figure": "open_figure",
            "click .delete_figure": "delete_figure",
            "click .export-options a": "select_export_option",
            "click .zoom-paper-to-fit": "zoom_paper_to_fit",
        },

        keyboardEvents: {
            'backspace': 'deleteSelectedPanels',
            'del': 'deleteSelectedPanels',
            'mod+a': 'select_all',
            'mod+c': 'copy_selected_panels',
            'mod+v': 'paste_panels',
            'mod+s': 'save_figure',
            'mod+n': 'goto_newfigure',
            'mod+o': 'open_figure',
            'down' : 'nudge_down',
            'up' : 'nudge_up',
            'left' : 'nudge_left',
            'right' : 'nudge_right',
        },

        // Heavy lifting of PDF generation handled by OMERO.script...
        export_pdf: function(event){

            event.preventDefault();

            // Status is indicated by showing / hiding 3 buttons
            var figureModel = this.model,
                $create_figure_pdf = $(event.target),
                $pdf_inprogress = $("#pdf_inprogress"),
                $pdf_download = $("#pdf_download");
            $create_figure_pdf.hide();
            $pdf_download.hide();
            $pdf_inprogress.show();

            // Get figure as json
            var figureJSON = this.model.figure_toJSON();

            var url = MAKE_WEBFIGURE_URL,
                data = {
                    figureJSON: JSON.stringify(figureJSON)
                };

            // Start the Figure_To_Pdf.py script
            $.post( url, data).done(function( data ) {

                // {"status": "in progress", "jobId": "ProcessCallback/64be7a9e-2abb-4a48-9c5e-6d0938e1a3e2 -t:tcp -h 192.168.1.64 -p 64592"}
                var jobId = data.jobId;

                // Now we keep polling for script completion, every second...

                var i = setInterval(function (){

                    $.getJSON(ACTIVITIES_JSON_URL, function(act_data) {

                            var pdf_job = act_data[jobId];

                            // We're waiting for this flag...
                            if (pdf_job.status == "finished") {
                                clearInterval(i);

                                // Update UI
                                $create_figure_pdf.show();
                                $pdf_inprogress.hide();
                                var fa_id = pdf_job.results.File_Annotation.id,
                                    fa_download = WEBINDEX_URL + "annotation/" + fa_id + "/";
                                $pdf_download.attr('href', fa_download).show();
                            }

                            if (act_data.inprogress === 0) {
                                clearInterval(i);
                            }

                        }).error(function() {
                            clearInterval(i);
                        });

                }, 1000);
            });
        },

        select_export_option: function(event) {
            event.preventDefault();
            var $a = $(event.target),
                $span = $a.children('span.glyphicon');
            // We take the <span> from the <a> and place it in the <button>
            if ($span.length === 0) $span = $a;  // in case we clicked on <span>
            var $li = $span.parent().parent(),
                $button = $li.parent().prev().prev(),
                option = $span.attr("data-option");
            var $flag = $button.find("span[data-option='" + option + "']");
            if ($flag.length > 0) {
                $flag.remove();
            } else {
                $span = $span.clone();
                $button.append($span);
            }
            $button.trigger('change');      // can listen for this if we want to 'submit' etc
        },

        nudge_right: function(event) {
            event.preventDefault();
            this.model.nudge_right();
        },

        nudge_left: function(event) {
            event.preventDefault();
            this.model.nudge_left();
        },

        nudge_down: function(event) {
            event.preventDefault();
            this.model.nudge_down();
        },

        nudge_up: function(event) {
            event.preventDefault();
            this.model.nudge_up();
        },

        goto_newfigure: function(event) {
            if (event) event.preventDefault();
            window.location.hash = "new";
        },

        delete_figure: function(event) {
            event.preventDefault();
            var fileId = this.model.get('fileId'),
                figName = this.model.get('figureName');
            if(fileId) {
                this.figureFiles.deleteFile(fileId, figName);
            }
        },

        open_figure: function(event) {
            event.preventDefault();
            $(".modal").modal('hide');
            $("#openFigureModal").modal();
            this.figureFiles.fetch();
        },

        save_figure: function(event) {
            event.preventDefault();

            this.$saveBtn.tooltip('hide');

            // Turn panels into json
            var figureModel = this.model;

            var options = {};
            if (figureModel.get('fileId')) {
                options.fileId = figureModel.get('fileId');
                // Save
                figureModel.save_to_OMERO(options, function(data){
                    window.location.hash = "figure/"+data;
                });
            } else {
                this.save_as();
            }

        },

        save_as: function(event) {
            if (event) {
                event.preventDefault();
            }

            var options = {},
                defaultName = this.model.get('figureName');
            if (!defaultName) {
                var d = new Date(),
                    dt = d.getFullYear() + "-" + (d.getMonth()+1) + "-" +d.getDate(),
                    tm = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
                defaultName = "Figure_" + dt + "_" + tm;
            } else {
                defaultName = defaultName + "_copy";
            }
            var figureName = prompt("Enter Figure Name", defaultName);

            if (figureName) {
                options.figureName = figureName;
                // Save
                this.model.save_to_OMERO(options, function(data){
                    window.location.hash = "figure/"+data;
                });
            }

        },

        copy_selected_panels: function(event) {
            event.preventDefault();
            var s = this.model.getSelected();
            this.clipboard_data = cd = [];
            _.each(s, function(m) {
                var copy = m.toJSON();
                delete copy.id;
                cd.push(copy);
            });
            this.$pasteBtn.removeClass("disabled");
        },

        paste_panels: function(event) {
            event.preventDefault();

            if (!this.clipboard_data) return;

            var self = this;
            this.model.clearSelected();

            // first work out the bounding box of clipboard panels
            var top, left, bottom, right;
            _.each(this.clipboard_data, function(m, i) {
                var t = m.y,
                    l = m.x,
                    b = t + m.height,
                    r = l + m.width;
                if (i === 0) {
                    top = t; left = l; bottom = b; right = r;
                } else {
                    top = Math.min(top, t);
                    left = Math.min(left, l);
                    bottom = Math.max(bottom, b);
                    right = Math.max(right, r);
                }
            });
            var height = bottom - top,
                width = right - left,
                offset_x = 0,
                offset_y = 0;

            // if pasting a 'row', paste below. Paste 'column' to right.
            if (width > height) {
                offset_y = height + height/20;  // add a spacer
            } else {
                offset_x = width + width/20;
            }

            // apply offset to clipboard data & paste
            _.each(this.clipboard_data, function(m) {
                m.x = m.x + offset_x;
                m.y = m.y + offset_y;
                self.model.panels.create(m);
            });
            // only pasted panels are selected - simply trigger...
            this.model.notifySelectionChange();
        },

        clipboard_data: undefined,

        select_all: function(event) {
            event.preventDefault();
            this.model.select_all();
        },

        deleteSelectedPanels: function(event) {
            event.preventDefault();
            this.model.deleteSelected();
        },

        // User has zoomed the UI - work out new sizes etc...
        // We zoom the main content 'canvas' using css transform: scale()
        // But also need to resize the canvas_wrapper manually.
        renderZoom: function() {
            var curr_zoom = this.model.get('curr_zoom'),
                zoom = curr_zoom * 0.01,
                newWidth = parseInt(this.orig_width * zoom, 10),
                newHeight = parseInt(this.orig_height * zoom, 10),
                scale = "scale("+zoom+", "+zoom+")";

            // We want to stay centered on the same spot...
            var curr_centre = this.getCentre(true);

            // Scale canvas via css
            this.$canvas.css({"transform": scale, "-webkit-transform": scale, "-ms-transform": scale});

            // Scale canvas wrapper manually
            var canvas_w = this.model.get('canvas_width'),
                canvas_h = this.model.get('canvas_height');
            var scaled_w = canvas_w * zoom,
                scaled_h = canvas_h * zoom;
            this.$canvas_wrapper.css({'width':scaled_w+"px", 'height': scaled_h+"px"});
            // and offset the canvas to stay visible
            var margin_top = (scaled_h - canvas_h)/2,
                margin_left = (scaled_w - canvas_w)/2;
            this.$canvas.css({'top': margin_top+"px", "left": margin_left+"px"});

            // ...apply centre from before zooming
            if (curr_centre) {
                this.setCentre(curr_centre);
            }

            // Show zoom level in UI
            $("#zoom_input").val(curr_zoom);
        },

        // Centre the viewport on the middle of the paper
        reCentre: function() {
            var paper_w = this.model.get('paper_width'),
                paper_h = this.model.get('paper_height');
            this.setCentre( {'x':paper_w/2, 'y':paper_h/2} );
        },

        // Get the coordinates on the paper of the viewport center.
        // Used after zoom update (but BEFORE the UI has changed)
        getCentre: function(previous) {
            // Need to know the zoom BEFORE the update
            var m = this.model,
                curr_zoom = m.get('curr_zoom');
            if (previous) {
                curr_zoom = m.previous('curr_zoom');
            }
            if (curr_zoom === undefined) {
                return;
            }
            var viewport_w = this.$main.width(),
                viewport_h = this.$main.height(),
                co = this.$canvas_wrapper.offset(),
                mo = this.$main.offset(),
                offst_left = co.left - mo.left,
                offst_top = co.top - mo.top,
                cx = -offst_left + viewport_w/2,
                cy = -offst_top + viewport_h/2,
                zm_fraction = curr_zoom * 0.01;

            var paper_left = (m.get('canvas_width') - m.get('paper_width'))/2,
                paper_top = (m.get('canvas_height') - m.get('paper_height'))/2;
            return {'x':(cx/zm_fraction)-paper_left, 'y':(cy/zm_fraction)-paper_top};
        },

        // Scroll viewport to place a specified paper coordinate at the centre
        setCentre: function(cx_cy, speed) {
            var m = this.model,
                paper_left = (m.get('canvas_width') - m.get('paper_width'))/2,
                paper_top = (m.get('canvas_height') - m.get('paper_height'))/2;
            var curr_zoom = m.get('curr_zoom'),
                zm_fraction = curr_zoom * 0.01,
                cx = (cx_cy.x+paper_left) * zm_fraction,
                cy = (cx_cy.y+paper_top) * zm_fraction,
                viewport_w = this.$main.width(),
                viewport_h = this.$main.height(),
                offst_left = cx - viewport_w/2,
                offst_top = cy - viewport_h/2;
            speed = speed || 0;
            this.$main.animate({
                scrollLeft: offst_left,
                scrollTop: offst_top
            }, speed);
        },

        zoom_paper_to_fit: function(event) {

            this.reCentre();

            var m = this.model,
                pw = m.get('paper_width'),
                ph = m.get('paper_height'),
                viewport_w = this.$main.width(),
                viewport_h = this.$main.height();

            var zoom_x = viewport_w/pw,
                zoom_y = viewport_h/ph,
                zm = Math.min(zoom_x, zoom_y);
            zm = (zm * 100) >> 0;

            // TODO: Need to update slider!
            m.set('curr_zoom', zm-5) ;
            $("#zoom_slider").slider({ value: zm-5 });
        },

        // Add a panel to the view
        addOne: function(panel) {
            var view = new PanelView({model:panel});    // uiState:this.uiState
            this.$paper.append(view.render().el);
        },

        renderFigureName: function() {

            var title = "OMERO.figure",
                figureName = this.model.get('figureName');
            if ((figureName) && (figureName.length > 0)) {
                title += " - " + figureName;
            }
            $('title').text(title);
        },

        renderSaveBtn: function() {

            var canEdit = this.model.get('canEdit'),
                noFile = (typeof this.model.get('fileId') == 'undefined'),
                btnText = (canEdit || noFile) ? "Save" : "Can't Save";
            this.$saveBtn.text(btnText);
            if (this.model.get('unsaved') && (canEdit || noFile)) {
                this.$saveBtn.addClass('btn-success').removeClass('btn-default').removeAttr('disabled');
                this.$saveOption.removeClass('disabled');
            } else {
                this.$saveBtn.addClass('btn-default').removeClass('btn-success').attr('disabled', 'disabled');
                this.$saveOption.addClass('disabled');
            }
            if (this.model.get('fileId')) {
                this.$deleteOption.removeClass('disabled');
            } else {
                this.$deleteOption.addClass('disabled');
            }
        },

        renderSelectionChange: function() {
            var $delete_panel = $('.delete_panel', this.$el);
            if (this.model.getSelected().length > 0) {
                $delete_panel.removeAttr("disabled");
                this.$copyBtn.removeClass("disabled");
            } else {
                $delete_panel.attr("disabled", "disabled");
                this.$copyBtn.addClass("disabled");
            }
        },

        // Render is called on init()
        // Update any changes to sizes of paper or canvas
        render: function() {
            var m = this.model,
                zoom = m.get('curr_zoom') * 0.01;

            var paper_w = m.get('paper_width'),
                paper_h = m.get('paper_height'),
                canvas_w = m.get('canvas_width'),
                canvas_h = m.get('canvas_height'),
                paper_left = (canvas_w - paper_w)/2,
                paper_top = (canvas_h - paper_h)/2;

            this.$paper.css({'width': paper_w, 'height': paper_h,
                    'left': paper_left, 'top': paper_top});
            $("#canvas").css({'width': this.model.get('canvas_width'),
                    'height': this.model.get('canvas_height')});

            return this;
        }
    });


    var SetIdModalView = Backbone.View.extend({

        el: $("#setIdModal"),

        template: _.template($('#preview_Id_change_template').html()),

        model:FigureModel,

        events: {
            "submit .addIdForm": "previewSetId",
            "click .preview": "previewSetId",
            "keyup .imgIds": "keyPressed",
            "click .doSetId": "doSetId",
        },

        initialize: function(options) {

            var self = this;

            // when dialog is shown, clear and render
            $("#setIdModal").bind("show.bs.modal", function(){
                delete self.newImg;
                self.render();
            });
        },

        // Only enable submit button when input has a number in it
        keyPressed: function() {
            var idInput = $('input.imgIds', this.$el).val(),
                previewBtn = $('button.preview', this.$el),
                re = /^\d+$/;
            if (re.test(idInput)) {
                previewBtn.removeAttr("disabled");
            } else {
                previewBtn.attr("disabled", "disabled");
            }
        },

        // handle adding Images to figure
        previewSetId: function(event) {
            event.preventDefault();

            var self = this,
                idInput = $('input.imgIds', this.$el).val();

            // get image Data
            $.getJSON(BASE_WEBFIGURE_URL + 'imgData/' + parseInt(idInput, 10) + '/', function(data){
                // just pick what we need
                var newImg = {
                    'imageId': data.id,
                    'name': data.meta.imageName,
                    // 'width': data.size.width,
                    // 'height': data.size.height,
                    'sizeZ': data.size.z,
                    'theZ': data.rdefs.defaultZ,
                    'sizeT': data.size.t,
                    // 'theT': data.rdefs.defaultT,
                    'channels': data.channels,
                    'orig_width': data.size.width,
                    'orig_height': data.size.height,
                    // 'x': px,
                    // 'y': py,
                    'datasetName': data.meta.datasetName,
                    'pixel_size_x': data.pixel_size.x,
                    'pixel_size_y': data.pixel_size.y,
                    'deltaT': data.deltaT,
                };
                self.newImg = newImg;
                self.render();
            });
        },

        doSetId: function() {

            var self = this,
                sel = this.model.getSelected();

            if (!self.newImg)   return;

            _.each(sel, function(p) {
                p.setId(self.newImg);
            });

        },

        render: function() {

            var sel = this.model.getSelected(),
                selImg,
                json = {};

            if (sel.length < 1) {
                self.selectedImage = null;
                return; // shouldn't happen
            }
            selImg = sel[0];
            json.selImg = selImg.toJSON();
            json.newImg = {};
            json.comp = {};
            json.messages = [];

            json.ok = function(match, match2) {
                if (typeof match == 'undefined') return "-";
                if (typeof match2 != 'undefined') {
                    match = match && match2;
                }
                var m = match ? "ok" : "flag";
                var rv = "<span class='glyphicon glyphicon-" + m + "'></span>";
                return rv;
            };

            // minor attributes ('info' only)
            var attrs = ["sizeZ", "orig_width", "orig_height"],
                attrName = ['Z size', 'Width', 'Height'];

            if (this.newImg) {
                json.newImg = this.newImg;
                // compare attrs above
                _.each(attrs, function(a, i) {
                    if (json.selImg[a] == json.newImg[a]) {
                        json.comp[a] = true;
                    } else {
                        json.comp[a] = false;
                        json.messages.push({"text":"Mismatch of " + attrName[i] + ": should be OK.",
                            "status": "success"});   // status correspond to css alert class.
                    }
                });
                // special message for sizeT
                if (json.selImg.sizeT != json.newImg.sizeT) {
                    // check if any existing images have theT > new.sizeT
                    var tooSmallT = false;
                    _.each(sel, function(o){
                        if (o.get('theT') > json.newImg.sizeT) tooSmallT = true;
                    });
                    if (tooSmallT) {
                        json.messages.push({"text": "New Image has fewer Timepoints than needed. Check after update.",
                            "status": "danger"});
                    } else {
                        json.messages.push({"text":"Mismatch of Timepoints: should be OK.",
                            "status": "success"});
                    }
                    json.comp.sizeT = false;
                } else {
                    json.comp.sizeT = true;
                }
                // compare channels
                json.comp.channels = json.ok(true);
                var selC = json.selImg.channels,
                    newC = json.newImg.channels,
                    cCount = selC.length;
                if (cCount != newC.length) {
                    json.comp.channels = json.ok(false);
                    json.messages.push({"text":"New Image has " + newC.length + " channels " +
                        "instead of " + cCount + ". Check after update.",
                            "status": "danger"});
                } else {
                    for (var i=0; i<cCount; i++) {
                        if (selC[i].label != newC[i].label) {
                            json.comp.channels = json.ok(false);
                            json.messages.push({"text": "Channel Names mismatch: should be OK.",
                                "status": "success"});
                            break;
                        }
                    }
                }

                $(".doSetId", this.$el).removeAttr('disabled');
            } else {
                $(".doSetId", this.$el).attr('disabled', 'disabled');
            }

            $(".previewIdChange", this.$el).html(this.template(json));
        }
    });


    var AddImagesModalView = Backbone.View.extend({

        el: $("#addImagesModal"),

        model:FigureModel,

        events: {
            "submit .addImagesForm": "addImages",
            "click .btn-primary": "addImages",
            "keyup .imgIds": "keyPressed",
        },

        initialize: function(options) {
            this.figureView = options.figureView;   // need this for .getCentre()

            var self = this;
            // when the modal dialog is shown, focus the input
            $("#addImagesModal").bind("focus",
                function() {
                    setTimeout(function(){
                        $('input.imgIds', self.$el).focus();
                    },20);
                });
        },

        // Only enable submit button when input has a number in it
        keyPressed: function() {
            var idInput = $('input.imgIds', this.$el).val(),
                submitBtn = $('button.btn-primary', this.$el),
                re = /\d.*/;
            if (re.test(idInput)) {
                submitBtn.removeAttr("disabled");
            } else {
                submitBtn.attr("disabled", "disabled");
            }
        },

        // handle adding Images to figure
        addImages: function() {

            var self = this,
                paper_width = this.model.get('paper_width'),
                iIds;

            var $input = $('input.imgIds', this.$el),
                submitBtn = $('button.btn-primary', this.$el),
                idInput = $input.val();

            $input.val("");
            submitBtn.attr("disabled", "disabled");

            if (!idInput || idInput.length === 0)    return;

            this.model.clearSelected();

            // test for E.g: http://localhost:8000/webclient/?show=image-25|image-26|image-27
            if (idInput.indexOf('?') > 10) {
                iIds = idInput.split('image-').slice(1);
            } else {
                iIds = idInput.split(',');
            }

            // approx work out number of columns to layout new panels
            var colCount = Math.ceil(Math.sqrt(iIds.length)),
                rowCount = Math.ceil(iIds.length/colCount),
                c = this.figureView.getCentre(),
                col = 0,
                row = 0,
                px, py, spacer, scale,
                coords = {'px': px,
                          'py': py,
                          'c': c,
                          'spacer': spacer,
                          'colCount': colCount,
                          'rowCount': rowCount,
                          'col': col,
                          'row': row,
                          'paper_width': paper_width};

            // This loop sets up a load of async imports.
            // The first one to return will set all the coords
            // and subsequent ones will update coords to position
            // new image panels appropriately in a grid.
            for (var i=0; i<iIds.length; i++) {
                var imgId = iIds[i];
                this.importImage(imgId, coords);
            }
        },

        importImage: function(imgId, coords) {

            if (parseInt(imgId, 10) <= 0) return;

            var self = this;

            // Get the json data for the image...
            $.getJSON(BASE_WEBFIGURE_URL + 'imgData/' + parseInt(imgId, 10) + '/', function(data){
                // For the FIRST IMAGE ONLY (coords.px etc undefined), we
                // need to work out where to start (px,py) now that we know size of panel
                // (assume all panels are same size)
                coords.spacer = coords.spacer || data.size.width/20;
                var full_width = (coords.colCount * (data.size.width + coords.spacer)) - coords.spacer,
                    full_height = (coords.rowCount * (data.size.height + coords.spacer)) - coords.spacer;
                coords.scale = (coords.paper_width - (2 * coords.spacer)) / full_width;
                coords.scale = Math.min(coords.scale, 1);    // only scale down
                coords.px = coords.px || coords.c.x - (full_width * coords.scale)/2;
                coords.py = coords.py || coords.c.y - (full_height * coords.scale)/2;
                var channels = data.channels;
                if (data.rdefs.model === "greyscale") {
                    // we don't support greyscale, but instead set active channel grey
                    _.each(channels, function(ch){
                        if (ch.active) {
                            ch.color = "FFFFFF";
                        }
                    });
                }
                // ****** This is the Data Model ******
                //-------------------------------------
                // Any changes here will create a new version
                // of the model and will also have to be applied
                // to the 'version_transform()' function so that
                // older files can be brought up to date.
                // Also check 'previewSetId()' for changes.
                var n = {
                    'imageId': data.id,
                    'name': data.meta.imageName,
                    'width': data.size.width * coords.scale,
                    'height': data.size.height * coords.scale,
                    'sizeZ': data.size.z,
                    'theZ': data.rdefs.defaultZ,
                    'sizeT': data.size.t,
                    'theT': data.rdefs.defaultT,
                    'channels': channels,
                    'orig_width': data.size.width,
                    'orig_height': data.size.height,
                    'x': coords.px,
                    'y': coords.py,
                    'datasetName': data.meta.datasetName,
                    'datasetId': data.meta.datasetId,
                    'pixel_size_x': data.pixel_size.x,
                    'pixel_size_y': data.pixel_size.y,
                    'deltaT': data.deltaT,
                };
                // create Panel (and select it)
                self.model.panels.create(n).set('selected', true);
                self.model.notifySelectionChange();

                // update px, py for next panel
                coords.col += 1;
                coords.px += (data.size.width + coords.spacer) * coords.scale;
                if (coords.col == coords.colCount) {
                    coords.row += 1;
                    coords.col = 0;
                    coords.py += (data.size.height + coords.spacer) * coords.scale;
                    coords.px = undefined; // recalculate next time
                }
            }).fail(function(event) {
                alert("Image ID: " + imgId + " not found");
            });

        }
    });


    var AlignmentToolbarView = Backbone.View.extend({

        el: $("#alignment-toolbar"),

        model:FigureModel,

        events: {
            "click .aleft": "align_left",
            "click .agrid": "align_grid",
            "click .atop": "align_top",

            "click .awidth": "align_width",
            "click .aheight": "align_height",
            "click .asize": "align_size",
        },

        initialize: function() {
            this.listenTo(this.model, 'change:selection', this.render);
            this.$buttons = $("button", this.$el);
        },

        align_left: function(event) {
            event.preventDefault();
            this.model.align_left();
        },

        align_grid: function(event) {
            event.preventDefault();
            this.model.align_grid();
        },

        align_width: function(event) {
            event.preventDefault();
            this.model.align_size(true, false);
        },

        align_height: function(event) {
            event.preventDefault();
            this.model.align_size(false, true);
        },

        align_size: function(event) {
            event.preventDefault();
            this.model.align_size(true, true);
        },

        align_top: function(event) {
            event.preventDefault();
            this.model.align_top();
        },

        render: function() {
            if (this.model.getSelected().length > 1) {
                this.$buttons.removeAttr("disabled");
            } else {
                this.$buttons.attr("disabled", "disabled");
            }
        }
    });



    // -------------------------Panel View -----------------------------------
    // A Panel is a <div>, added to the #paper by the FigureView below.
    var PanelView = Backbone.View.extend({
        tagName: "div",
        className: "imagePanel",
        template: _.template($('#figure_panel_template').html()),
        label_template: _.template($('#label_template').html()),
        label_vertical_template: _.template($('#label_vertical_template').html()),
        label_table_template: _.template($('#label_table_template').html()),
        scalebar_template: _.template($('#scalebar_panel_template').html()),

        initialize: function(opts) {
            // we render on Changes in the model OR selected shape etc.
            this.model.on('destroy', this.remove, this);
            this.listenTo(this.model,
                'change:x change:y change:width change:height change:zoom change:dx change:dy',
                this.render_layout);
            this.listenTo(this.model, 'change:scalebar change:pixel_size_x', this.render_scalebar);
            this.listenTo(this.model, 'change:channels change:theZ change:theT', this.render_image);
            this.listenTo(this.model, 'change:labels change:theT change:deltaT', this.render_labels);
            // This could be handled by backbone.relational, but do it manually for now...
            // this.listenTo(this.model.channels, 'change', this.render);
            // During drag, model isn't updated, but we trigger 'drag'
            this.model.on('drag_resize', this.drag_resize, this);

            this.render();
        },

        events: {
            // "click .img_panel": "select_panel"
        },

        // During drag, we resize etc
        drag_resize: function(xywh) {
            var x = xywh[0],
                y = xywh[1],
                w = xywh[2],
                h = xywh[3];
            this.update_resize(x, y, w, h);
            this.$el.addClass('dragging');
        },

        render_layout: function() {
            var x = this.model.get('x'),
                y = this.model.get('y'),
                w = this.model.get('width'),
                h = this.model.get('height');

            this.update_resize(x, y, w, h);
            this.$el.removeClass('dragging');
        },

        update_resize: function(x, y, w, h) {

            // update layout of panel on the canvas
            this.$el.css({'top': y +'px',
                        'left': x +'px',
                        'width': w +'px',
                        'height': h +'px'});

            // container needs to be square for rotation to vertical
            $('.left_vlabels', this.$el).css('width', h + 'px');

            // update the img within the panel
            var zoom = this.model.get('zoom'),
                vp_css = this.model.get_vp_img_css(zoom, w, h);
            this.$img_panel.css(vp_css);

            // update length of scalebar
            var sb = this.model.get('scalebar');
            if (sb && sb.show) {
                // this.$scalebar.css('width':);
                var sb_pixels = sb.length / this.model.get('pixel_size_x');
                var panel_scale = vp_css.width / this.model.get('orig_width'),
                    sb_width = panel_scale * sb_pixels;
                this.$scalebar.css('width', sb_width);
            }
        },

        render_image: function() {
            var src = this.model.get_img_src();
            this.$img_panel.attr('src', src);
        },

        render_labels: function() {

            $('.label_layout', this.$el).remove();  // clear existing labels

            var labels = this.model.get('labels'),
                self = this,
                positions = {
                    'top':[], 'bottom':[], 'left':[], 'right':[],
                    'leftvert':[],
                    'topleft':[], 'topright':[],
                    'bottomleft':[], 'bottomright':[]
                };

            // group labels by position
            _.each(labels, function(l) {
                // check if label is dynamic delta-T
                var ljson = $.extend(true, {}, l);
                if (typeof ljson.text == 'undefined' && ljson.time) {
                    ljson.text = self.model.get_time_label_text(ljson.time);
                }
                positions[l.position].push(ljson);
            });

            // Render template for each position and append to Panel.$el
            var html = "";
            _.each(positions, function(lbls, p) {
                var json = {'position':p, 'labels':lbls};
                if (lbls.length === 0) return;
                if (p == 'leftvert') {  // vertical
                    html += self.label_vertical_template(json);
                } else if (p == 'left' || p == 'right') {
                    html += self.label_table_template(json);
                } else {
                    html += self.label_template(json);
                }
            });
            self.$el.append(html);

            // need to force update of vertical labels layout
            $('.left_vlabels', self.$el).css('width', self.$el.height() + 'px');

            return this;
        },

        render_scalebar: function() {

            if (this.$scalebar) {
                this.$scalebar.remove();
            }
            var sb = this.model.get('scalebar');
            if (sb && sb.show) {
                var sb_json = {};
                sb_json.position = sb.position;
                sb_json.color = sb.color;
                sb_json.width = sb.pixels;  // TODO * scale

                var sb_html = this.scalebar_template(sb_json);
                this.$el.append(sb_html);
            }
            this.$scalebar = $(".scalebar", this.$el);

            // update scalebar size wrt current sizes
            this.render_layout();
        },

        render: function() {

            // Have to handle potential nulls, since the template doesn't like them!
            var json = {'imageId': this.model.get('imageId')};
            // need to add the render string, E.g: 1|110:398$00FF00,2|...

            var html = this.template(json);
            this.$el.html(html);

            this.$img_panel = $(".img_panel", this.$el);    // cache for later

            this.render_image();
            this.render_labels();
            this.render_scalebar();     // also calls render_layout()

            return this;
        }
    });


    // The 'Right Panel' is the floating Info, Preview etc display.
    // It listens to selection changes on the FigureModel and updates it's display
    // By creating new Sub-Views

    var RightPanelView = Backbone.View.extend({

        initialize: function(opts) {
            // we render on selection Changes in the model
            this.listenTo(this.model, 'change:selection', this.render);

            // this.render();
            new LabelsPanelView({model: this.model});
        },

        render: function() {
            var selected = this.model.getSelected();

            if (this.vp) {
                this.vp.clear().remove();
            }
            if (selected.length > 0) {
                this.vp = new ImageViewerView({models: selected}); // auto-renders on init
                $("#viewportContainer").append(this.vp.el);
            }

            if (this.ipv) {
                this.ipv.remove();
            }
            if (selected.length > 0) {
                this.ipv = new InfoPanelView({models: selected});
                $("#infoTab").append(this.ipv.render().el);
            }

            if (this.ctv) {
                this.ctv.clear().remove();
            }
            if (selected.length > 0) {
                this.ctv = new ChannelToggleView({models: selected});
                $("#channelToggle").empty().append(this.ctv.render().el);
            }

        }
    });


    var LabelsPanelView = Backbone.View.extend({

        model: FigureModel,

        template: _.template($("#labels_form_inner_template").html()),

        el: $("#labelsTab"),

        initialize: function(opts) {
            this.listenTo(this.model, 'change:selection', this.render);

            // one-off build 'New Label' form, with same template as used for 'Edit Label' forms
            var json = {'l': {'text':'', 'size':12, 'color':'000000'}, 'position':'top', 'edit':false};
            $('.new-label-form', this.$el).html(this.template(json));
            $('.btn-sm').tooltip({container: 'body', placement:'bottom', toggle:"tooltip"});

            this.render();
        },

        events: {
            "submit .new-label-form": "handle_new_label",
            "click .dropdown-menu a": "select_dropdown_option",
        },

        // Handles all the various drop-down menus in the 'New' AND 'Edit Label' forms
        select_dropdown_option: function(event) {
            event.preventDefault();
            var $a = $(event.target),
                $span = $a.children('span');
            // For the Label Text, handle this differently...
            if ($a.attr('data-label')) {
                $('.new-label-form .label-text', this.$el).val( $a.attr('data-label') );
            }
            // All others, we take the <span> from the <a> and place it in the <button>
            if ($span.length === 0) $span = $a;  // in case we clicked on <span>
            var $li = $span.parent().parent(),
                $button = $li.parent().prev();
            $span = $span.clone();
            $('span:first', $button).replaceWith($span);
            $button.trigger('change');      // can listen for this if we want to 'submit' etc
        },

        // submission of the New Label form
        handle_new_label: function(event) {
            var $form = $(event.target),
                label_text = $('.label-text', $form).val(),
                font_size = $('.font-size', $form).text().trim(),
                position = $('.label-position span:first', $form).attr('data-position'),
                color = $('.label-color span:first', $form).attr('data-color');

            if (label_text.length === 0) {
                alert("Please enter some text for the label");
                return false;
            }

            var selected = this.model.getSelected();

            if (label_text == '[channels]') {
                _.each(selected, function(m) {
                    m.create_labels_from_channels({position:position, size:font_size});
                });
                return false;
            }

            if (label_text.slice(0, 5) == '[time') {
                var format = label_text.slice(6, -1);   // 'secs', 'hrs:mins' etc
                _.each(selected, function(m) {
                    m.create_labels_from_time({format: format,
                            position:position,
                            size:font_size,
                            color: color
                    });
                });
                return false;
            }

            var label = {
                text: label_text,
                size: parseInt(font_size, 10),
                position: position,
                color: color
            };

            _.each(selected, function(m) {
                if (label_text === "[image-name]") {
                    var pathnames = m.get('name').split('/');
                    label.text = pathnames[pathnames.length-1];
                } else if (label_text === "[dataset-name]") {
                    label.text = m.get('datasetName') ? m.get('datasetName') : "No/Many Datasets";
                }
                m.add_labels([label]);
            });
            return false;
        },

        render: function() {

            var selected = this.model.getSelected();

            // html is already in place for 'New Label' form - simply show/hide
            if (selected.length === 0) {
                $(".new-label-form", this.$el).hide();
            } else {
                $(".new-label-form", this.$el).show();
                // if none of the selected panels have time data, disable 'add_time_label's
                var have_time = false, dTs;
                for (var i=0; i<selected.length; i++) {
                    dTs = selected[i].get('deltaT');
                    if (dTs && dTs.length > 0) {
                        have_time = true;
                        break;
                    }
                }
                if (have_time) {
                    $(".add_time_label", this.$el).removeClass('disabled');
                } else {
                    $(".add_time_label", this.$el).addClass('disabled');
                }
            }

            // show selected panels labels below
            var old = this.sel_labels_panel;

            if (selected.length > 0) {
                this.sel_labels_panel = new SelectedPanelsLabelsView({models: selected});
                this.sel_labels_panel.render();
                $("#selected_panels_labels").empty().append(this.sel_labels_panel.$el);
            }
            if (old) {
                old.remove();
            }

            // show scalebar form for selected panels
            var old_sb = this.scalebar_form;
            // if (old_sb) {
            //     old_sb.remove();
            // }
            var $scalebar_form = $("#scalebar_form");

            if (selected.length > 0) {
                this.scalebar_form = new ScalebarFormView({models: selected});
                this.scalebar_form.render();
                $scalebar_form.empty().append(this.scalebar_form.$el);
            }
            if (old_sb) {
                old_sb.remove();
            }

            return this;
        }

    });


    // Created new for each selection change
    var SelectedPanelsLabelsView = Backbone.View.extend({

        template: _.template($("#labels_form_template").html()),
        inner_template: _.template($("#labels_form_inner_template").html()),

        initialize: function(opts) {

            // prevent rapid repetative rendering, when listening to multiple panels
            this.render = _.debounce(this.render);

            this.models = opts.models;
            var self = this;

            _.each(this.models, function(m){
                self.listenTo(m, 'change:labels change:theT', self.render);
            });
        },

        events: {
            "submit .edit-label-form": "handle_label_edit",
            "change .btn": "form_field_changed",
            "blur .label-text": "form_field_changed",
            "click .delete-label": "handle_label_delete",
        },

        handle_label_delete: function(event) {

            var $form = $(event.target).parent(),
                key = $form.attr('data-key'),
                deleteMap = {};

            deleteMap[key] = false;

            _.each(this.models, function(m, i){
                m.edit_labels(deleteMap);
            });
            return false;
        },

        // Automatically submit the form when a field is changed
        form_field_changed: function(event) {
            $(event.target).closest('form').submit();
        },

        // Use the label 'key' to specify which labels to update
        handle_label_edit: function(event) {

            var $form = $(event.target),
                label_text = $('.label-text', $form).val(),
                font_size = $('.font-size', $form).text().trim(),
                position = $('.label-position span:first', $form).attr('data-position'),
                color = $('.label-color span:first', $form).attr('data-color'),
                key = $form.attr('data-key');

            var new_label = {text:label_text, size:font_size, position:position, color:color};

            var newlbls = {};
            newlbls[key] = new_label;

            _.each(this.models, function(m, i){
                m.edit_labels(newlbls);
            });
            return false;
        },

        render: function() {

            var self = this,
                positions = {'top':{}, 'bottom':{}, 'left':{}, 'leftvert':{}, 'right':{},
                    'topleft':{}, 'topright':{}, 'bottomleft':{}, 'bottomright':{}};
            _.each(this.models, function(m, i){
                // group labels by position
                _.each(m.get('labels'), function(l) {
                    // remove duplicates by mapping to unique key
                    var key = m.get_label_key(l),
                        ljson = $.extend(true, {}, l);
                        ljson.key = key;
                    if (typeof ljson.text == 'undefined' && ljson.time) {
                        ljson.text = m.get_time_label_text(ljson.time);
                    }
                    positions[l.position][key] = ljson;
                });
            });

            this.$el.empty();

            // Render template for each position and append to $el
            var html = "";
            _.each(positions, function(lbls, p) {

                lbls = _.map(lbls, function(label, key){ return label; });

                var json = {'position':p, 'labels':lbls};
                if (lbls.length === 0) return;
                json.inner_template = self.inner_template;
                html += self.template(json);
            });
            self.$el.append(html);

            return this;
        }
    });


    // Created new for each selection change
    var ScalebarFormView = Backbone.View.extend({

        template: _.template($("#scalebar_form_template").html()),

        initialize: function(opts) {

            // prevent rapid repetative rendering, when listening to multiple panels
            this.render = _.debounce(this.render);

            this.models = opts.models;
            var self = this;

            _.each(this.models, function(m){
                self.listenTo(m, 'change:scalebar change:pixel_size_x', self.render);
            });

            // this.$el = $("#scalebar_form");
        },

        events: {
            "submit .scalebar_form": "update_scalebar",
            "change .btn": "dropdown_btn_changed",
            "click .hide_scalebar": "hide_scalebar",
            "click .pixel_size_display": "edit_pixel_size",
            "keypress .pixel_size_input"  : "enter_pixel_size",
            "blur .pixel_size_input"  : "save_pixel_size",
        },

        // simply show / hide editing field
        edit_pixel_size: function() {
            $('.pixel_size_display', this.$el).hide();
            $(".pixel_size_input", this.$el).css('display','inline-block').focus();
        },
        done_pixel_size: function() {
            $('.pixel_size_display', this.$el).show();
            $(".pixel_size_input", this.$el).css('display','none').focus();
        },

        // If you hit `enter`, set pixel_size
        enter_pixel_size: function(e) {
            if (e.keyCode == 13) {
                this.save_pixel_size(e);
            }
        },

        // on 'blur' or 'enter' we save...
        save_pixel_size: function(e) {
            // save will re-render, but only if number has changed - in case not...
            this.done_pixel_size();

            var val = $(e.target).val();
            if (val.length === 0) return;
            var pixel_size = parseFloat(val);
            if (isNaN(pixel_size)) return;
            _.each(this.models, function(m, i){
                m.save('pixel_size_x', pixel_size);
            });
        },

        // Automatically submit the form when a dropdown is changed
        dropdown_btn_changed: function(event) {
            $(event.target).closest('form').submit();
        },

        hide_scalebar: function() {
            _.each(this.models, function(m, i){
                m.hide_scalebar();
            });
        },

        // called when form changes
        update_scalebar: function(event) {

            var $form = $('#scalebar_form form');

            var length = $('.scalebar-length', $form).val(),
                position = $('.label-position span:first', $form).attr('data-position'),
                color = $('.label-color span:first', $form).attr('data-color');

            _.each(this.models, function(m, i){
                var sb = {show: true};
                if (length != '-') sb.length = parseInt(length, 10);
                if (position != '-') sb.position = position;
                if (color != '-') sb.color = color;

                m.save_scalebar(sb);
            });
            return false;
        },

        render: function() {

            var json = {show: false},
                hidden = false,
                sb;

            _.each(this.models, function(m, i){
                // start with json data from first Panel
                if (!json.pixel_size_x) {
                    json.pixel_size_x = m.get('pixel_size_x');
                } else {
                    pix_sze = m.get('pixel_size_x');
                    // account for floating point imprecision when comparing
                    if (json.pixel_size_x != '-' &&
                        json.pixel_size_x.toFixed(10) != pix_sze.toFixed(10)) {
                            json.pixel_size_x = '-';
                    }
                }
                sb = m.get('scalebar');
                // ignore scalebars if not visible
                if (sb) {
                    if (!json.length) {
                        json.length = sb.length;
                        json.units = sb.units;
                        json.position = sb.position;
                        json.color = sb.color;
                    }
                    else {
                        if (json.length != sb.length) json.length = '-';
                        if (json.units != sb.units) json.units = '-';
                        if (json.position != sb.position) json.position = '-';
                        if (json.color != sb.color) json.color = '-';
                    }
                }
                // if any panels don't have scalebar - we allow to add
                if(!sb || !sb.show) hidden = true;
            });

            if (this.models.length === 0 || hidden) {
                json.show = true;
            }
            json.length = json.length || 10;
            json.units = json.units || 'um';
            json.position = json.position || 'bottomright';
            json.color = json.color || 'FFFFFF';

            var html = this.template(json);
            this.$el.html(html);

            return this;
        }
    });


    var InfoPanelView = Backbone.View.extend({

        template: _.template($("#info_panel_template").html()),
        xywh_template: _.template($("#xywh_panel_template").html()),

        initialize: function(opts) {
            // if (opts.models) {
            if (opts.models.length > 1) {
                this.models = opts.models;
                var self = this;
                _.each(this.models, function(m){
                    self.listenTo(m, 'change:x change:y change:width change:height change:imageId', self.render);
                });
            } else if (opts.models.length == 1) {
                this.model = opts.models[0];
                this.listenTo(this.model, 'change:x change:y change:width change:height', this.render);
                this.listenTo(this.model, 'drag_resize', this.drag_resize);
            }
            // } 
        },

        events: {
            "click .setId": "setImageId",
        },

        setImageId: function(event) {
            event.preventDefault();
            // Simply show dialog - Everything else handled by SetIdModalView
            $("#setIdModal").modal('show');
            $("#setIdModal .imgIds").val("").focus();
        },

        // just update x,y,w,h by rendering ONE template
        drag_resize: function(xywh) {
            $("#xywh_table").remove();
            var json = {'x': xywh[0], 'y':xywh[1], 'width':xywh[2]>>0, 'height':xywh[3]>>0},
                xywh_html = this.xywh_template(json);
            this.$el.append(xywh_html);
        },

        // render BOTH templates
        render: function() {
            var json;
            if (this.model) {
                json = this.model.toJSON();
            } else if (this.models) {
                var title = this.models.length + " Panels Selected...";
                _.each(this.models, function(m, i){
                    // start with json data from first Panel
                    if (!json) {
                        json = m.toJSON();
                        json.name = title;
                    } else {
                        // compare json summary so far with this Panel
                        var this_json = m.toJSON(),
                            attrs = ["imageId", "orig_width", "orig_height", "sizeT", "sizeZ", "x", "y", "width", "height"];
                        _.each(attrs, function(a){
                            if (json[a] != this_json[a]) {
                                json[a] = "-";
                            }
                        });
                    }
                });
            }
            // Format floating point values
            _.each(["x", "y", "width", "height"], function(a){
                if (json[a] != "-") {
                    json[a] = json[a].toFixed(0);
                }
            });

            json.setImageId = (json.imageId > 0);

            if (json) {
                var html = this.template(json),
                    xywh_html = this.xywh_template(json);
                this.$el.html(html + xywh_html);
            }
            return this;
        }

    });


    var ImageViewerView = Backbone.View.extend({

        template: _.template($('#viewport_template').html()),

        className: "imageViewer",

        initialize: function(opts) {

            // prevent rapid repetative rendering, when listening to multiple panels
            this.render = _.debounce(this.render);

            this.full_size = 250;

            this.models = opts.models;
            var self = this,
                zoom_sum = 0,
                theZ_sum = 0,
                theT_sum = 0;
            this.sizeZ = this.models[0].get('sizeZ');
            this.sizeT = this.models[0].get('sizeT');

            _.each(this.models, function(m){
                self.listenTo(m, 'change:width change:height change:channels change:zoom change:theZ change:theT', self.render);
                zoom_sum += m.get('zoom');
                theZ_sum += m.get('theZ');
                theT_sum += m.get('theT');
                if (self.sizeZ != m.get('sizeZ')) {
                    self.sizeZ = undefined;
                }
                if (self.sizeT != m.get('sizeT')) {
                    self.sizeT = undefined;
                }
            });

            this.zoom_avg = zoom_sum/ this.models.length;
            this.theZ_avg = theZ_sum/ this.models.length;
            this.theT_avg = theT_sum/ this.models.length;

            $("#vp_zoom_slider").slider({
                max: 800,
                min: 100,
                value: self.zoom_avg,
                slide: function(event, ui) {
                    self.update_img_css(ui.value, 0, 0);
                },
                stop: function( event, ui ) {
                    self.zoom_avg = ui.value;
                    var to_save = {'zoom': ui.value};
                    if (ui.value === 100) {
                        to_save.dx = 0;
                        to_save.dy = 0;
                    }
                    _.each(self.models, function(m){
                        m.save(to_save);
                    });
                }
            });
            this.$vp_zoom_value = $("#vp_zoom_value");

            var Z_disabled = false,
                sizeZ = self.sizeZ;
            if (!sizeZ || sizeZ === 1) {    // undefined or 1
                Z_disabled = true;
                sizeZ = 1;
            }
            $("#vp_z_slider").slider({
                orientation: "vertical",
                max: sizeZ,
                disabled: Z_disabled,
                min: 1,             // model is 0-based, UI is 1-based
                value: self.theZ_avg + 1,
                slide: function(event, ui) {
                    $("#vp_z_value").text(ui.value + "/" + self.sizeZ);
                },
                stop: function( event, ui ) {
                    _.each(self.models, function(m){
                        m.save('theZ', ui.value - 1);
                    });
                }
            });

            var T_disabled = false,
                sizeT = self.sizeT;
            if (!sizeT || sizeT === 1) {    // undefined or 1
                T_disabled = true;
                sizeT = 1;
            }
            $("#vp_t_slider").slider({
                max: sizeT,
                disabled: T_disabled,
                min: 1,             // model is 0-based, UI is 1-based
                value: self.theT_avg + 1,
                slide: function(event, ui) {
                    var theT = ui.value;
                    $("#vp_t_value").text(theT + "/" + self.sizeT);
                    var dt = self.models[0].get('deltaT')[theT-1];
                    _.each(self.models, function(m){
                        if (m.get('deltaT')[theT-1] != dt) {
                            dt = undefined;
                        }
                    });
                    $("#vp_deltaT").text(self.formatTime(dt));
                },
                stop: function( event, ui ) {
                    _.each(self.models, function(m){
                        m.save('theT', ui.value - 1);
                    });
                }
            });

            this.render();
        },

        events: {
            "mousedown .vp_img": "mousedown",
            "mousemove .vp_img": "mousemove",
            "mouseup .vp_img": "mouseup",
        },

        mousedown: function(event) {
            this.dragging = true;
            this.dragstart_x = event.clientX;
            this.dragstart_y = event.clientY;
            return false;
        },

        mouseup: function(event) {
            var dx = event.clientX - this.dragstart_x,
                dy = event.clientY - this.dragstart_y;
            this.update_img_css(this.zoom_avg, dx, dy, true);
            this.dragging = false;
            return false;
        },

        mousemove: function(event) {
            if (this.dragging) {
                var dx = event.clientX - this.dragstart_x,
                    dy = event.clientY - this.dragstart_y;
                this.update_img_css(this.zoom_avg, dx, dy);
            }
            return false;
        },

        // called by the parent View before .remove()
        clear: function() {
            // clean up zoom slider etc
            $( "#vp_zoom_slider" ).slider( "destroy" );
            $("#vp_z_slider").slider("destroy");
            $("#vp_t_slider").slider("destroy");
            this.$vp_zoom_value.text('');
            return this;
        },

        update_img_css: function(zoom, dx, dy, save) {

            dx = dx / (zoom/100);
            dy = dy / (zoom/100);

            if (this.$vp_img) {
                var frame_w = this.$vp_frame.width() + 2,
                    frame_h = this.$vp_frame.height() + 2;
                dx = (dx / frame_w) * this.models[0].get('orig_width');
                dy = (dy / frame_h) * this.models[0].get('orig_height');
                dx += this.dx;
                dy += this.dy;
                this.$vp_img.css( this.models[0].get_vp_img_css(zoom, frame_w, frame_h, dx, dy) );
                this.$vp_zoom_value.text(zoom + "%");

                if (save) {
                    this.dx = dx;
                    this.dy = dy;
                    _.each(this.models, function(m){
                        m.save({'dx': dx,
                                'dy': dy});
                    });
                }
            }
        },

        formatTime: function(seconds) {

            var mins, secs, hours;
            if (typeof seconds === 'undefined') {
                return "";
            }
            else if (seconds < 60) {
                return seconds + " secs";
            } else if (seconds < 3600) {
                mins = (seconds / 60) >> 0;
                secs = (seconds % 60) >> 0;
                return mins + "min " + secs + "s";
            } else {
                hours = (seconds / 3600) >> 0;
                mins = (seconds % 3600 / 60) >> 0;
                secs = (seconds % 60) >> 0;
                return hours + "h " + mins + "min " + secs + "s";
            }
        },

        render: function() {

            if (this.models.length === 0);

            // only show viewport if original w / h ratio is same for all models
            var model = this.models[0];
            var orig_wh,
                sum_wh = 0,
                sum_zoom = 0,
                sum_theZ = 0,
                max_theZ = 0,
                sum_theT = 0,
                max_theT = 0,
                sum_deltaT = 0,
                max_deltaT = 0,
                sum_dx = 0,
                sum_dy = 0,
                imgs_css = [],
                same_wh = true;

            // first, work out frame w & h - use average w/h ratio of all selected panels
            _.each(this.models, function(m){
                var wh = m.get('orig_width') / m.get('orig_height');
                if (!orig_wh) {
                    orig_wh = wh;
                } else if (orig_wh != wh) {
                    same_wh = false;
                }
                sum_wh += (m.get('width')/ m.get('height'));
                sum_zoom += m.get('zoom');
                sum_theZ += m.get('theZ');
                var theT = m.get('theT'),
                    dT = m.get('deltaT')[theT] || 0;
                sum_theT += theT;
                sum_deltaT += dT;
                max_theZ = Math.max(max_theZ, m.get('theZ'));
                max_theT = Math.max(max_theT, theT);
                max_deltaT = Math.max(max_deltaT, dT);
            });
            // Only continue if panels are all same w/h ratio
            if (!same_wh) return;

            // get average viewport frame w/h & zoom
            var wh = sum_wh/this.models.length,
                zoom = sum_zoom/this.models.length,
                theZ = sum_theZ/this.models.length,
                theT = sum_theT/this.models.length;
                deltaT = sum_deltaT/this.models.length;
            if (wh <= 1) {
                frame_h = this.full_size;
                frame_w = this.full_size * wh;
            } else {
                frame_w = this.full_size;
                frame_h = this.full_size / wh;
            }

            // Now get img src & positioning css for each panel, 
            _.each(this.models, function(m){
                sum_dx += m.get('dx');
                sum_dy += m.get('dy');
                var src = m.get_img_src(),
                    img_css = model.get_vp_img_css(m.get('zoom'), frame_w, frame_h, m.get('dx'), m.get('dy'));
                img_css.src = src;
                imgs_css.push(img_css);
            });

            // save these average offsets in hand for dragging (apply to all panels)
            this.dx = sum_dx/this.models.length;
            this.dy = sum_dy/this.models.length;

            var json = {};

            json.opacity = 1 / imgs_css.length;
            json.imgs_css = imgs_css;
            json.frame_w = frame_w;
            json.frame_h = frame_h;
            json.sizeZ = this.sizeZ || "-";
            json.theZ = theZ+1;
            json.sizeT = this.sizeT || "-";
            json.theT = theT+1;
            json.deltaT = deltaT;
            if (max_theZ != theZ) {
                json.theZ = "-";
            }
            if (max_theT != theT) {
                json.theT = "-";
            }
            if (max_deltaT != deltaT || this.sizeT == 1) {
                json.deltaT = "";
            } else {
                json.deltaT = this.formatTime(deltaT);
            }
            var html = this.template(json);
            this.$el.html(html);

            this.$vp_frame = $(".vp_frame", this.$el);  // cache for later
            this.$vp_img = $(".vp_img", this.$el);
            this.$vp_zoom_value.text(zoom + "%");

            return this;
        }
    });

    // Coloured Buttons to Toggle Channels on/off.
    var ChannelToggleView = Backbone.View.extend({
        tagName: "div",
        template: _.template($('#channel_toggle_template').html()),

        initialize: function(opts) {
            // This View may apply to a single PanelModel or a list
            this.models = opts.models;
            var self = this;
            _.each(this.models, function(m){
                self.listenTo(m, 'change:channels', self.render);
            });
        },

        events: {
            "click .channel-btn": "toggle_channel",
            "click .dropdown-menu a": "pick_color"
        },

        pick_color: function(e) {
            var color = e.currentTarget.getAttribute('data-color'),
                idx = $(e.currentTarget).parent().parent().attr('data-index');
            if (this.model) {
                this.model.save_channel(idx, 'color', color);
            } else if (this.models) {
                _.each(this.models, function(m){
                    m.save_channel(idx, 'color', color);
                });
            }
            return false;
        },

        toggle_channel: function(e) {
            var idx = e.currentTarget.getAttribute('data-index');

            if (this.model) {
                this.model.toggle_channel(idx);
            } else if (this.models) {
                // 'flat' means that some panels have this channel on, some off
                var flat = $(e.currentTarget).hasClass('ch-btn-flat');
                _.each(this.models, function(m){
                    if(flat) {
                        m.toggle_channel(idx, true);
                    } else {
                        m.toggle_channel(idx);
                    }
                });
            }
            return false;
        },

        clear: function() {
            $(".ch_slider").slider("destroy");
            $("#channel_sliders").empty();
            return this;
        },

        render: function() {
            var json, html,
                self = this;
            if (this.models) {

                // Comare channels from each Panel Model to see if they are
                // compatible, and compile a summary json.
                json = [];
                var compatible = true;

                _.each(this.models, function(m, i){
                    var chs = m.get('channels');
                    // start with a copy of the first image channels
                    if (json.length === 0) {
                        _.each(chs, function(c) {
                            json.push($.extend(true, {}, c));
                        });
                    } else{
                        // compare json summary so far with this channels
                        if (json.length != chs.length) {
                            compatible = false;
                        } else {
                            // if attributes don't match - show 'null' state
                            _.each(chs, function(c, i) {
                                if (json[i].color != c.color) {
                                    json[i].color = 'ccc';
                                }
                                if (json[i].active != c.active) {
                                    json[i].active = undefined;
                                }
                                // process the 'window' {min, max, start, end}
                                var wdw = json[i].window,    // the window we're updating
                                    w = c.window;
                                wdw.min = Math.min(wdw.min, w.min);
                                wdw.max = Math.max(wdw.max, w.max);
                                wdw.start = wdw.start + w.start;    // average when done
                                wdw.end = wdw.end + w.end;
                            });
                        }
                    }
                });

                if (compatible) {
                    html = this.template({'channels':json});
                    this.$el.html(html);

                    $(".ch_slider").slider("destroy");
                    var $channel_sliders = $("#channel_sliders").empty();
                    _.each(json, function(ch, idx) {
                        // Turn 'start' and 'end' into average values
                        var start = (ch.window.start / self.models.length) << 0,
                            end = (ch.window.end / self.models.length) << 0,
                            min = Math.min(ch.window.min, start),
                            max = Math.max(ch.window.max, end),
                            color = ch.color;
                        if (color == "FFFFFF") color = "ccc";  // white slider would be invisible
                        var $div = $("<div><span class='ch_start'>" + start +"</span><div class='ch_slider' style='background-color:#"+color+"'></div><span class='ch_end'>" + end +"</span></div>")
                            .appendTo($channel_sliders);

                        $div.find('.ch_slider').slider({
                            min: min,
                            max: max,
                            values: [start, end],
                            slide: function(event, ui) {
                                $div.children('.ch_start').text(ui.values[0]);
                                $div.children('.ch_end').text(ui.values[1]);
                            },
                            stop: function(event, ui) {
                                _.each(self.models, function(m) {
                                    m.save_channel_window(idx, {'start': ui.values[0], 'end': ui.values[1]});
                                });
                            }
                        });
                    });
                }
            }
            return this;
        }
    });

    // -------------- Selection Overlay Views ----------------------


    // SvgView uses ProxyRectModel to manage Svg Rects (raphael)
    // This converts between zoomed coordiantes of the html DOM panels
    // and the unzoomed SVG overlay.
    // Attributes of this model apply to the SVG canvas and are updated from
    // the PanelModel.
    // The SVG RectView (Raphael) notifies this Model via trigger 'drag' & 'dragStop'
    // and this is delegated to the PanelModel via trigger or set respectively.

    // Used by a couple of different models below
    var getModelCoords = function(coords) {
        var zoom = this.figureModel.get('curr_zoom') * 0.01,
            paper_top = (this.figureModel.get('canvas_height') - this.figureModel.get('paper_height'))/2,
            paper_left = (this.figureModel.get('canvas_width') - this.figureModel.get('paper_width'))/2,
            x = (coords.x/zoom) - paper_left - 1,
            y = (coords.y/zoom) - paper_top - 1,
            w = coords.width/zoom,
            h = coords.height/zoom;
        return {'x':x>>0, 'y':y>>0, 'width':w>>0, 'height':h>>0};
    };

    var ProxyRectModel = Backbone.Model.extend({

        initialize: function(opts) {
            this.panelModel = opts.panel;    // ref to the genuine PanelModel
            this.figureModel = opts.figure;

            this.renderFromModel();

            // Refresh c
            this.listenTo(this.figureModel, 'change:curr_zoom', this.renderFromModel);
            this.listenTo(this.panelModel, 'change:x change:y change:width change:height', this.renderFromModel);
            // when PanelModel is being dragged, but NOT by this ProxyRectModel...
            this.listenTo(this.panelModel, 'drag_resize', this.renderFromTrigger);
            this.listenTo(this.panelModel, 'change:selected', this.renderSelection);
            this.panelModel.on('destroy', this.clear, this);
            // listen to a trigger on this Model (triggered from Rect)
            this.listenTo(this, 'drag_xy', this.drag_xy);
            this.listenTo(this, 'drag_xy_stop', this.drag_xy_stop);
            this.listenTo(this, 'drag_resize', this.drag_resize);
            // listen to change to this model - update PanelModel
            this.listenTo(this, 'drag_resize_stop', this.drag_resize_stop);
        },

        // return the SVG x, y, w, h (converting from figureModel)
        getSvgCoords: function(coords) {
            var zoom = this.figureModel.get('curr_zoom') * 0.01,
                paper_top = (this.figureModel.get('canvas_height') - this.figureModel.get('paper_height'))/2,
                paper_left = (this.figureModel.get('canvas_width') - this.figureModel.get('paper_width'))/2,
                rect_x = (paper_left + 1 + coords.x) * zoom,
                rect_y = (paper_top + 1 + coords.y) * zoom,
                rect_w = coords.width * zoom,
                rect_h = coords.height * zoom;
            return {'x':rect_x, 'y':rect_y, 'width':rect_w, 'height':rect_h};
        },

        // return the Model x, y, w, h (converting from SVG coords)
        getModelCoords: getModelCoords,

        // called on trigger from the RectView, on drag of the whole rect OR handle for resize.
        // we simply convert coordinates and delegate to figureModel
        drag_xy: function(xy, save) {
            var zoom = this.figureModel.get('curr_zoom') * 0.01,
                dx = xy[0]/zoom,
                dy = xy[1]/zoom;

            this.figureModel.drag_xy(dx, dy, save);
        },

        // As above, but this time we're saving the changes to the Model
        drag_xy_stop: function(xy) {
            this.drag_xy(xy, true);
        },

        // Called on trigger from the RectView on resize. 
        // Need to convert from Svg coords to Model and notify the PanelModel without saving.
        drag_resize: function(xywh) {
            var coords = this.getModelCoords({'x':xywh[0], 'y':xywh[1], 'width':xywh[2], 'height':xywh[3]});
            this.panelModel.drag_resize(coords.x, coords.y, coords.width, coords.height);
        },

        // As above, but need to update the Model on changes to Rect (drag stop etc)
        drag_resize_stop: function(xywh) {
            var coords = this.getModelCoords({'x':xywh[0], 'y':xywh[1], 'width':xywh[2], 'height':xywh[3]});
            this.panelModel.save(coords);
        },

        // Called when the FigureModel zooms or the PanelModel changes coords.
        // Refreshes the RectView since that listens to changes in this ProxyModel
        renderFromModel: function() {
            this.set( this.getSvgCoords({
                'x': this.panelModel.get('x'),
                'y': this.panelModel.get('y'),
                'width': this.panelModel.get('width'),
                'height': this.panelModel.get('height')
            }) );
        },

        // While the Panel is being dragged (by the multi-select Rect), we need to keep updating
        // from the 'multiselectDrag' trigger on the model. RectView renders on change
        renderFromTrigger:function(xywh) {
            var c = this.getSvgCoords({
                'x': xywh[0],
                'y': xywh[1],
                'width': xywh[2],
                'height': xywh[3]
            });
            this.set( this.getSvgCoords({
                'x': xywh[0],
                'y': xywh[1],
                'width': xywh[2],
                'height': xywh[3]
            }) );
        },

        // When PanelModel changes selection - update and RectView will render change
        renderSelection: function() {
            this.set('selected', this.panelModel.get('selected'));
        },

        // Handle click (mousedown) on the RectView - changing selection.
        handleClick: function(event) {
            if (event.shiftKey) {
                this.figureModel.addSelected(this.panelModel);
            } else {
                this.figureModel.setSelected(this.panelModel);
            }
        },

        clear: function() {
            this.destroy();
        }

    });


    // This model underlies the Rect that is drawn around multi-selected panels
    // (only shown if 2 or more panels selected)
    // On drag or resize, we calculate how to move or resize the seleted panels.
    var MultiSelectRectModel = ProxyRectModel.extend({

        defaults: {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        },

        initialize: function(opts) {
            this.figureModel = opts.figureModel;

            // listen to a trigger on this Model (triggered from Rect)
            this.listenTo(this, 'drag_xy', this.drag_xy);
            this.listenTo(this, 'drag_xy_stop', this.drag_xy_stop);
            this.listenTo(this, 'drag_resize', this.drag_resize);
            this.listenTo(this, 'drag_resize_stop', this.drag_resize_stop);
            this.listenTo(this.figureModel, 'change:selection', this.updateSelection);
            this.listenTo(this.figureModel, 'change:curr_zoom', this.updateSelection);

            // also listen for drag_xy coming from a selected panel
            this.listenTo(this.figureModel, 'drag_xy', this.update_xy);
        },


        // Need to re-draw on selection AND zoom changes
        updateSelection: function() {

            var min_x = 100000, max_x = -10000,
                min_y = 100000, max_y = -10000;

            var selected = this.figureModel.getSelected();
            if (selected.length < 1){

                this.set({
                    'x': 0,
                    'y': 0,
                    'width': 0,
                    'height': 0,
                    'selected': false
                });
                return;
            }

            for (var i=0; i<selected.length; i++) {
                var panel = selected[i],
                    x = panel.get('x'),
                    y = panel.get('y'),
                    w = panel.get('width'),
                    h = panel.get('height');
                min_x = Math.min(min_x, x);
                max_x = Math.max(max_x, x+w);
                min_y = Math.min(min_y, y);
                max_y = Math.max(max_y, y+h);
            }

            this.set( this.getSvgCoords({
                'x': min_x,
                'y': min_y,
                'width': max_x - min_x,
                'height': max_y - min_y
            }) );

            // Rect SVG will be notified and re-render
            this.set('selected', true);
        },


        // Called when we are notified of drag_xy on one of the Panels
        update_xy: function(dxdy) {
            if (! this.get('selected')) return;     // if we're not visible, ignore

            var svgCoords = this.getSvgCoords({
                'x': dxdy[0],
                'y': dxdy[1],
                'width': 0,
                'height': 0,
            });
            this.set({'x':svgCoords.x, 'y':svgCoords.y});
        },

        // RectView drag is delegated to Panels to update coords (don't save)
        drag_xy: function(dxdy, save) {
            // we just get [x,y] but we need [x,y,w,h]...
            var x = dxdy[0] + this.get('x'),
                y = dxdy[1] + this.get('y');
            var xywh = [x, y, this.get('width'), this.get('height')];
            this.notifyModelofDrag(xywh, save);
        },

        // As above, but Save is true since we're done dragging
        drag_xy_stop: function(dxdy, save) {
            this.drag_xy(dxdy, true);
            // Have to keep our proxy model in sync
            this.set({
                'x': dxdy[0] + this.get('x'),
                'y': dxdy[1] + this.get('y')
            });
        },

        // While the multi-select RectView is being dragged, we need to calculate the new coords
        // of all selected Panels, based on the start-coords and the current coords of
        // the multi-select Rect.
        drag_resize: function(xywh, save) {
            this.notifyModelofDrag(xywh, save);
        },

        // RectView dragStop is delegated to Panels to update coords (with save 'true')
        drag_resize_stop: function(xywh) {
            this.notifyModelofDrag(xywh, true);

            this.set({
                'x': xywh[0],
                'y': xywh[1],
                'width': xywh[2],
                'height': xywh[3]
            });
        },

        // While the multi-select RectView is being dragged, we need to calculate the new coords
        // of all selected Panels, based on the start-coords and the current coords of
        // the multi-select Rect.
        notifyModelofDrag: function(xywh, save) {
            var startCoords = this.getModelCoords({
                'x': this.get('x'),
                'y': this.get('y'),
                'width': this.get('width'),
                'height': this.get('height')
            });
            var dragCoords = this.getModelCoords({
                'x': xywh[0],
                'y': xywh[1],
                'width': xywh[2],
                'height': xywh[3]
            });

            // var selected = this.figureModel.getSelected();
            // for (var i=0; i<selected.length; i++) {
            //     selected[i].multiselectdrag(startCoords.x, startCoords.y, startCoords.width, startCoords.height,
            //         dragCoords.x, dragCoords.y, dragCoords.width, dragCoords.height, save);
            this.figureModel.multiselectdrag(startCoords.x, startCoords.y, startCoords.width, startCoords.height,
                    dragCoords.x, dragCoords.y, dragCoords.width, dragCoords.height, save);
            // };
        },

        // Ignore mousedown
        handleClick: function(event) {

        }
    });

    // var ProxyRectModelList = Backbone.Collection.extend({
    //     model: ProxyRectModel
    // });

    var SvgView = Backbone.View.extend({

        initialize: function(opts) {

            var self = this,
                canvas_width = this.model.get('canvas_width'),
                canvas_height = this.model.get('canvas_height');
            this.figureModel = this.model;  // since getModelCoords() expects this.figureModel

            // Create <svg> canvas
            this.raphael_paper = Raphael("canvas_wrapper", canvas_width, canvas_height);

            // this.panelRects = new ProxyRectModelList();
            self.$dragOutline = $("<div style='border: dotted #0a0a0a 1px; position:absolute; z-index:1'></div>")
                .appendTo("#canvas_wrapper");
            self.outlineStyle = self.$dragOutline.get(0).style;


            // Add global mouse event handlers
            self.dragging = false;
            self.drag_start_x = 0;
            self.drag_start_y = 0;
            $("#canvas_wrapper>svg")
                .mousedown(function(event){
                    self.dragging = true;
                    var parentOffset = $(this).parent().offset();
                    //or $(this).offset(); if you really just want the current element's offset
                    self.left = self.drag_start_x = event.pageX - parentOffset.left;
                    self.top = self.drag_start_y = event.pageY - parentOffset.top;
                    self.dx = 0;
                    self.dy = 0;
                    self.$dragOutline.css({
                            'left': self.drag_start_x,
                            'top': self.drag_start_y,
                            'width': 0,
                            'height': 0
                        }).show();
                    // return false;
            })
                .mousemove(function(event){
                    if (self.dragging) {
                        var parentOffset = $(this).parent().offset();
                        //or $(this).offset(); if you really just want the current element's offset
                        self.left = self.drag_start_x;
                        self.top = self.drag_start_y;
                        self.dx = event.pageX - parentOffset.left - self.drag_start_x;
                        self.dy = event.pageY - parentOffset.top - self.drag_start_y;
                        if (self.dx < 0) {
                            self.left = self.left + self.dx;
                            self.dx = Math.abs(self.dx);
                        }
                        if (self.dy < 0) {
                            self.top = self.top + self.dy;
                            self.dy = Math.abs(self.dy);
                        }
                        self.$dragOutline.css({
                            'left': self.left,
                            'top': self.top,
                            'width': self.dx,
                            'height': self.dy
                        });
                        // .show();
                        // self.outlineStyle.left = left + 'px';
                        // self.outlineStyle.top = top + 'px';
                        // self.outlineStyle.width = dx + 'px';
                        // self.outlineStyle.height = dy + 'px';
                    }
                    // return false;
            })
                .mouseup(function(event){
                    if (self.dragging) {
                        self.handleClick(event);
                        self.$dragOutline.hide();
                    }
                    self.dragging = false;
                    // return false;
            });

            // If a panel is added...
            this.model.panels.on("add", this.addOne, this);
            this.listenTo(this.model, 'change:curr_zoom', this.renderZoom);

            var multiSelectRect = new MultiSelectRectModel({figureModel: this.model}),
                rv = new RectView({'model':multiSelectRect, 'paper':this.raphael_paper,
                        'handle_wh':7, 'handles_toFront': true});
            rv.selected_line_attrs = {'stroke-width': 1, 'stroke':'#4b80f9'};
        },

        // A panel has been added - We add a corresponding Raphael Rect 
        addOne: function(m) {

            var rectModel = new ProxyRectModel({panel: m, figure:this.model});
            new RectView({'model':rectModel, 'paper':this.raphael_paper,
                    'handle_wh':5, 'disable_handles': true});
        },

        // TODO
        remove: function() {
            // TODO: remove from svg, remove event handlers etc.
        },

        // We simply re-size the Raphael svg itself - Shapes have their own zoom listeners
        renderZoom: function() {
            var zoom = this.model.get('curr_zoom') * 0.01,
                newWidth = this.model.get('canvas_width') * zoom,
                newHeight = this.model.get('canvas_height') * zoom;

            this.raphael_paper.setSize(newWidth, newHeight);
        },

        getModelCoords: getModelCoords,

        // Any mouse click (mouseup) or dragStop that isn't captured by Panel Rect clears selection
        handleClick: function(event) {
            if (!event.shiftKey) {
                this.model.clearSelected();
            }
            // select panels overlapping with drag outline
            if (this.dx > 0 || this.dy > 0) {
                var coords = this.getModelCoords({x: this.left, y: this.top, width:this.dx, height:this.dy});
                this.model.selectByRegion(coords);
            }
        }
    });

