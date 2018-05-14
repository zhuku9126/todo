'use strict'

var TodoItem = function (info) {
    if (info) {
       var obj = JSON.parse(info);
       this.todoId = obj.todoId; // 待做 id
       this.author = obj.author;
       this.note = obj.note; // 待做事项
       this.status = obj.status; // 0-未完成；1-已完成
       this.doneTime = obj.doneTime; // 完成时间
    }
};

TodoItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var UserTodo = function () {
    this.items = [];
};

var TodoList = function () {
    LocalContractStorage.defineMapProperty(this, "todo");
    LocalContractStorage.defineMapProperty(this, "idxmap");
};

TodoList.prototype = {
    init: function () {
    },

    get: function () {
        var from = Blockchain.transaction.from;
        var items = this.todo.get(from);

        return items;
    },

    addNewItem: function (note) {
        var from = Blockchain.transaction.from;

        // 处理每个人的todoid 问题
        var idx = this.idxmap.get(from);
        if (idx) {
            idx += 1;
        } else {
            idx = 1;
        }
        this.idxmap.set(from, idx);

        var item = new TodoItem();
        item.todoId = idx;
        item.author = from;
        item.note = note;
        item.status = 0;
        item.doneTime = 0; // 初始化

        var utodo = this.todo.get(from);
        if (utodo) {
            utodo = JSON.parse(utodo);
        } else {
            utodo = new UserTodo();
        }

        utodo.items.push(item);
        utodo = JSON.stringify(utodo);

        this.todo.set(from, utodo);
    },

    done: function(todoId) {
        todoId = parseInt(todoId);
        var from = Blockchain.transaction.from;

        var utodo = this.todo.get(from);
        utodo = JSON.parse(utodo);
        for(var i=0; i<utodo.items.length; i++) {
            if (utodo.items[i].todoId == todoId) {
                utodo.items[i].status = 1;
                utodo.items[i].doneTime = Date.now();
                break;
            }
        }

        utodo = JSON.stringify(utodo);
        this.todo.set(from, utodo);
    },

    getCurAddr: function () {
        return Blockchain.transaction.from;
    }
};

module.exports = TodoList;