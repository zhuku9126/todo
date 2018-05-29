'use strict';

var hasWallet = true;

var dappAddr = "n1qMrrLSNdFME12wKFFWv4Yp1SUAytqDKqo";
var Nebulas = require("nebulas");
var neb = new Nebulas.Neb();
var Account = Nebulas.Account;

neb.setRequest(new Nebulas.HttpRequest("https://mainnet.nebulas.io"));

var NebPay = require("nebpay");
var nebPay = new NebPay();

var serialNumber;
var intervalQuery;
var userCaddr = "";
var defaultUser = 'n1UkzP977VGbsPth7rQqaMDnVCGUtRUzCPY';
var fee = 0;

$(document).ready(function () {
    // 读取合约上余额和其他信息
    function getContractInfo() {
        doGET(defaultUser, "getContractInfo", [], getContractInfoCallback);
    }

    function getContractInfoCallback(resp) {
        console.log("resp info: ", resp);
        var ret = resp.result;
        if(ret == null) {

        } else {
            ret = JSON.parse(ret);
            fee = ret.fee;
            var showFee = convertWeiToNas(fee);

            var balance = ret.balance;
            balance = convertWeiToNas(balance);

            var totalAmt = ret.totalAmt;
            totalAmt = convertWeiToNas(totalAmt);

            console.log(fee, balance, totalAmt);

            $("#totalAmt").text(totalAmt + " nas");
            $("#balance").text(balance + " nas");
            $("#fee").text(showFee + " nas");
        }
    }

    // 读取历史记录
    function getHistory() {
        var func = "getAllQueryCaddr";
        doGET(defaultUser, func, [], getHistoryCb);
    }

    function getHistoryCb(resp) {
        console.log("get history resp info: ", resp);
        var ret = resp.result;
        if(ret == null) {

        } else {
            ret = JSON.parse(ret);
            console.log(ret);

            if(ret.length > 0) {
                var html = '<div class="col-12" id="history">';
                for(var i=0; i<ret.length; i++) {
                    var tmp = '<a href="./code.html?addr=' + ret[i] + '">' + ret[i] + '</a> ';
                    html += tmp;
                }

                html += '</div>';

                $("#history").html(html);
            }
        }
    }

    // 使用此方法，保存用户信息，根据情况要求用户给手续费
    $("#doQuery").click(function (event) {
        event.preventDefault();
        var caddr = $("#caddr").val();
        if(Account.isValidAddress(caddr) != true) {
            $("#querying").text("请输入合法的合约地址");
            return;
        }

        if(hasWallet == false) {
            $("#querying").text("请先安装钱包插件，再使用本网站功能");
            return;
        }

        $("#querying").text("合约地址有效性检查中...");

        userCaddr = caddr;

        // 先检查是否可以查询回来数据，然后根据情况，要求用户付费
        if(fee > 0) {
            checkAddrIsContract(caddr);
        } else {
            var value = convertWeiToNas(fee);
            var callFunc = "saveQuery";
            var args = [caddr];

            doPost(value, callFunc, args, doQueryCallback);
        }
    });

    // 获取用户支付打赏，查询展示信息
    function getPayAndQuery() {
        var value = convertWeiToNas(fee);
        var callFunc = "saveQuery";
        var args = [userCaddr];

        doPost(value, callFunc, args, doQueryCallback);
    }

    function doQueryCallback(resp) {
        console.log("doQueryCallback: ", resp);
        if(typeof resp == "string") {
           if(resp.indexOf('Error') != -1) {
               if(resp.indexOf('reject') != -1) {
                   $("#querying").text("需要提交交易才能查询");
               } else {
                   $("#querying").text("交易发生错误 " + resp);
               }
           } else {
               $("#querying").text("发生未知错误，请刷新页面重试");
           }
        } else {
            var txhash = resp.txhash;
            console.log("txhash: ", txhash);

            intervalQuery = setInterval(function () {
                doIntervalQuery(txhash, doQuerySuccessCb, doQueryFailCb);
            }, 5000);
        }
    }
    
    function doQuerySuccessCb(resp) {
        // 用户支付成功后，给其查询代码
        neb.api.getTransactionByContract(userCaddr).then(function (resp) {
            if(resp.status == 0) {
                // failed
                console.log("根据合约地址读取 txhash 信息失败 ", resp);
                $("#querying").text("根据合约地址读取信息失败，请检查合约地址");

            } else if (resp.status == 1) {
                // success
                console.log("根据合约地址读取 txhash 信息成功 ", resp);
                var data = resp.data;
                data = Base64.decode(data);
                console.log(data);
                console.log(typeof data);

                data = JSON.parse(data);
                var codeSource = data.Source;

                var qAddr = "<p>合约地址: " + '<a href="https://explorer.nebulas.io/#/address/' + resp.contract_address + '" target="_blank">' + resp.contract_address + "</a></p>";
                var qHash = "<p>合约HASH: " + '<a href="https://explorer.nebulas.io/#/tx/' + resp.hash + '" target="_blank">' + resp.hash + "</a></p>";

                var div = '<div class="col-12">';
                div += qAddr;
                div += qHash;
                var code = '<pre><code class="javascript">' + codeSource + '</code></pre>';
                div += code;
                div += "</div>";
                $("#querying").html(div);
                hljs.initHighlighting();

            } else {

            }
        }).catch(function (err) {
            $("#querying").text("查询合约失败 " + err.message);
        });
    }
    
    function doQueryFailCb(resp) {
        // 支付失败，提示用户错误信息
        var errMsg = resp.execute_error;
        $("#querying").text(errMsg);
    }

    function doIntervalQuery(txhash, succCallback, failCallback) {
        neb.api.getTransactionReceipt(txhash).then(function (resp) {
            if(resp.status == 0) {
                // failed
                console.log("failed ", resp);
                clearInterval(intervalQuery);
                failCallback(resp);

            } else if(resp.status == 1) {
                // success
                console.log("success ", resp);
                clearInterval(intervalQuery);
                getHistory();
                succCallback(resp);

            } else {
                // waiting
                console.log("间歇性查询中...")
            }
        });
    }


    function queryHisAddr(addr) {
        // 用户支付成功后，给其查询代码
        neb.api.getTransactionByContract(addr).then(function (resp) {
            if(resp.status == 0) {
                // failed
                console.log("根据合约地址读取 txhash 信息失败 ", resp);
                $("#detailquerying").text("根据合约地址读取信息失败，请检查合约地址");

            } else if (resp.status == 1) {
                // success
                console.log("根据合约地址读取 txhash 信息成功 ", resp);
                var data = resp.data;
                data = Base64.decode(data);
                console.log(data);
                console.log(typeof data);

                data = JSON.parse(data);
                var codeSource = data.Source;

                var qAddr = "<p>合约地址: " + '<a href="https://explorer.nebulas.io/#/address/' + resp.contract_address + '" target="_blank">' + resp.contract_address + "</a></p>";
                var qHash = "<p>合约HASH: " + '<a href="https://explorer.nebulas.io/#/tx/' + resp.hash + '" target="_blank">' + resp.hash + "</a></p>";

                var div = '<div class="col-md-12">';
                div += qAddr;
                div += qHash;
                var code = '<pre><code class="javascript">' + codeSource + '</code></pre>';
                div += code;
                div += "</div>";
                $("#detailquerying").html(div);
                hljs.initHighlighting();

            } else {

            }
        }).catch(function (err) {
            $("#detailquerying").text("查询合约失败 " + err.message);
        });
    }

    function checkAddrIsContract(addr) {
        neb.api.getTransactionByContract(addr).then(function (resp) {
            console.log("检查是否有效合约 ", addr, resp);
            if(resp.status == 0) {
                $("#querying").text("不是有效的合约地址，请检查输入信息。");
                return false;
            } else if (resp.status == 1) {
                getPayAndQuery();
                return true;
            } else {
                $("#querying").text("不是有效的合约地址，请检查输入信息。");
                return false;
            }
        }).catch(function (err) {
            console.log("检查地址是否合约出错 ", err.message);
            $("#querying").text("不是有效的合约地址，请检查输入信息。");
            return false;
        })
    }

    function doGET(from, func, args, callback) {
        var value = "0";
        var nonce = "0";
        var gas_price = "1000000";
        var gas_limit = "2000000";
        var callFunc = func;
        var callArgs = JSON.stringify(args);
        var contract = {
            "function": callFunc,
            "args": callArgs
        };

        neb.api.call(from, dappAddr, value, nonce, gas_price, gas_limit, contract).then(function (resp) {
            callback(resp);
        }).catch(function (err) {
            console.log("读取 " + callFunc + " 失败 " + err.message);
        })
    }

    function doPost(value, func, args, callbackFunc) {
        var to = dappAddr;
        var val = value;
        var callFunc = func;
        var callArgs = JSON.stringify(args);

        serialNumber = nebPay.call(to, val, callFunc, callArgs, {
            listener: callbackFunc
        });

        console.log("serialNumber is: ", serialNumber);

        $("#querying").text("请付费，交易处理及查询大概需要十多秒，请稍后...");
    }

    function convertWeiToNas(wei) {
        var unit = Nebulas.Unit;
        return unit.fromBasic(wei, "nas");
    }

    function convertNasToWei(nas) {
        var unit = Nebulas.Unit;
        var utils = Nebulas.Utils;
        return unit.nasToBasic(utils.toBigNumber(nas));
    }

    function checkWallet() {
        if (typeof(webExtensionWallet) === 'undefined') {
            var tips = '<div class="row alert alert-danger">\n' +
                '    <a href="https://github.com/ChengOrangeJu/WebExtensionWallet" target="_blank"> <strong>注意!</strong>未检测到浏览器扩展，请点我下载安装\n</a>' +
                '    <a href="#" class="close" data-dismiss="alert">&times;</a>\n' +
                '</div>'
            $("#tips").html(tips);
            hasWallet = false;
        }
    }

    checkWallet();

    var curUri = window.location.href;
    if(curUri.indexOf('code') == -1) {
        getContractInfo();
        getHistory();
    } else {
        getContractInfo();
        var sp = new URLSearchParams(window.location.search);
        var addr = sp.get('addr');
        queryHisAddr(addr);
    }
});

