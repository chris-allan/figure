
var FigureFile = Backbone.Model.extend({

    initialize: function() {

        var desc = this.get('description');
        if (desc && desc.imageId) {
            this.set('imageId', desc.imageId);
        } else {
            this.set('imageId', 0);
        }
    },
});


var FileList = Backbone.Collection.extend({

    model: FigureFile,

    initialize: function() {
    },

    deleteFile: function(fileId, name) {
        // may not have fetched files...
        var f = this.get(fileId),   // might be undefined
            msg = "Delete '" + name + "'?";
        if (confirm(msg)) {
            $.post( DELETE_WEBFIGURE_URL, { fileId: fileId })
                .done(this.remove(f));
            window.location.hash = "";
        }
    },

    url: function() {
        return LIST_WEBFIGURES_URL;
    }
});


var FileListView = Backbone.View.extend({

    initialize:function () {
        this.$el = $('#figure_files');
        var self = this;
        this.model.bind("reset, remove, sync", this.render, this);
        this.model.bind("add", function (file) {
            var e = new FileListItemView({model:file}).render().el;
            self.$el.append(e);
        });
    },

    render:function () {

        var self = this;
        this.$el.empty();
        if (this.model.models.length === 0) {
            var msg = "<tr><td colspan='3'>" +
                "You have no figures. Start by <a href='#new'>creating a new figure</a>" +
                "</td></tr>";
            self.$el.html(msg);
        }
        _.each(this.model.models, function (file) {
            var e = new FileListItemView({model:file}).render().el;
            self.$el.append(e);
        });
        return this;
    }
});

var FileListItemView = Backbone.View.extend({

    tagName:"tr",

    template: _.template($('#figure_file_item').html()),

    initialize:function () {
        this.model.bind("change", this.render, this);
        this.model.bind("destroy", this.close, this);
    },

    events: {
        "click a": "hide_file_chooser"
    },

    hide_file_chooser: function() {
        $("#openFigureModal").modal('hide');
    },

    render:function () {
        var h = this.template(this.model.toJSON());
        $(this.el).html(h);
        return this;
    }

});