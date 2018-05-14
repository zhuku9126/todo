'use strict'
if (typeof(webExtensionWallet) === 'undefined') {
    var tips = '<div class="alert alert-danger fade in">\n' +
        '    <a href="#" class="close" data-dismiss="alert">&times;</a>\n' +
        '    <a href="https://github.com/ChengOrangeJu/WebExtensionWallet" target="_blank"> <strong>注意!</strong>未检测到浏览器扩展，请点我下载安装\n</a>' +
        '</div>'
    $("#tips").html(tips);
}

var dappAddress = "n238sxVAh4YmLFEYXgxfhWDzB8ufCUNu4Rw";

var nebulas = require("nebulas");
var neb = new nebulas.Neb();

neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io"));

var NebPay = require("nebpay");
var nebPay = new NebPay();

var serialNumber;
var intervalQuery;
var curUser = "";

$(document).ready(function () {
    // 新增 todo
    $("#addNew").click(function () {
        var to = dappAddress;
        var value = "0";
        var callFunction = "addNewItem";

        var note = $("#newItem").val();

        var callArgs = "[\"" + note + "\"]";

        console.log("note info: ", note)
        console.log("callargs: ", callArgs)

        serialNumber = nebPay.call(to, value, callFunction, callArgs, {
            listener: cbAddNew
        });

        console.log("serialNumber is: ", serialNumber);
    });

    function interQueryFunc(txhash) {
        neb.api.getTransactionReceipt(txhash).then(function (resp) {
            console.log("tx result: ", resp);
            if(resp.status === 1) {
                clearInterval(intervalQuery);
                // 刷新页面
                console.log(Date.now());
                queryMyNote();
            }
        });
    }

    function cbAddNew(resp) {
        console.log("response of push: ", resp, "type of", typeof resp);
        var txhash = resp.txhash;

        intervalQuery = setInterval(function () {
            interQueryFunc(txhash);
        }, 5000);
    }

    // 标记为已完成
    $('.todolist').on('change','#sortable li input[type="checkbox"]',function(){
        if($(this).prop('checked')){
            var todoId = $(this).attr('value');
            doneList(todoId);
        }
    });

    function doneList(todoId) {
        var to = dappAddress;
        var value = "0";
        var callFunc = "done";
        var callArgs = "[\"" + todoId + "\"]";

        serialNumber = nebPay.call(to, value, callFunc, callArgs, {
            listener: cbdoneList
        })

    }

    function cbdoneList(resp) {
        console.log("response of done: ", JSON.stringify(resp));
        // queryMyNote();
        var txhash = resp.txhash;

        intervalQuery = setInterval(function () {
            interQueryFunc(txhash);
        }, 5000);
    }

    function queryMyNote() {
        var from = curUser;
        if(from == null) {
            console.log("from user address is null");
            return;
        }
        console.log("queryMyNote has been callbacked", Date.now());

        var value = "0";
        var nonce = "0";
        var gas_price = "1000000";
        var gas_limit = "2000000";
        var callFunction = "get";
        var callArgs = "[]";
        var contract = {
            "function": callFunction,
            "args": callArgs
        };

        neb.api.call(from, dappAddress, value, nonce, gas_price, gas_limit, contract).then(function (resp) {
            cbQuery(resp);
        }).catch(function (err) {
            console.log("读取信息失败 " + err.message);
        })
    }

    function cbQuery(resp) {
        var result = resp.result;
        console.log("resp info ", result);

        if (result === 'null') {

        } else {
            result = JSON.parse(result);
            result = JSON.parse(result);

            var items = result.items;
            items.reverse();

            var todolist = generateTodoList(items);
            var donelist = generateDoneList(items);

            $("#sortable").html(todolist);
            $("#done-items").html(donelist);
            $("#newItem").val("");
        }
    }

    function getCurUserAddr() {
        var func = "getCurAddr"
        nebPay.simulateCall(dappAddress, "0", func, "", {
            listener: cbGetCurUser
        });
    }

    function cbGetCurUser(resp) {
        var result = resp.result;
        console.log("getcuruser ", result);

        if (result === "null") {
            alert("似乎没有装插件，请先装插件再使用");
        } else {
            curUser = result.slice(1, -1);
            queryMyNote();
        }
    }

    function generateTodoList(items) {
        var tmp = [];
        tmp.push('<ul id="sortable" class="list-unstyled">');

        for(var i=0; i<items.length; i++) {
            var s = items[i].status;
            if(s != 0) {
                continue;
            }

            var note = items[i].note;
            var idx = items[i].todoId;

            var info = '<li class="ui-state-default"><div class="checkbox"><label><input type="checkbox" value="' + idx + '"' + '/>' + note + '</label></div></li>';
            tmp.push(info);
        }
        tmp.push('</ul>');
        return tmp;
    }

    function generateDoneList(items) {
        var tmpItems = []
        for(var i=0; i < items.length; i++) {
            var item = items[i];
            if(item.status === 1) {
                tmpItems.push(item);
            }
        }

        // 对这些数据按照 doneTime 逆排序
        tmpItems.sort(sortTime);

        var tmp = [];
        tmp.push('<ul id="done-items" class="list-unstyled">');

        for(var i=0; i<tmpItems.length; i++) {
            var note = tmpItems[i].note;
            var idx = tmpItems[i].todoId;

            var info = '<li>' + note + '</li>';
            tmp.push(info);
        }
        tmp.push('</ul>');
        return tmp;
    }

    function sortTime() {
        return function (a, b) {
            var d1 = a.doneTime;
            var d2 = b.doneTime;

            if (d1 < d2) {
                return 1;
            } else if (d1 > d2) {
                return -1;
            } else {
                return 0;
            }
        }
    }

    getCurUserAddr();
});

