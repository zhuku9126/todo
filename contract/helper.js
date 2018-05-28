"use strict";

// 星云合约代码查看辅助器

// 主要功能是，用户输入合约地址，程序找到合约代码，展示出来。
// 辅助功能是，用户输入 dapp 应用地址，爬虫程序辅助找到合约地址，然后再用上面的功能。
// 查看合约代码，需要用户付费 nas。

var QueryItem = function (data) {
    if(data) {
        data = JSON.parse(data);

        this.user = data.user; // 查询用户
        this.caddr = data.caddr; // 要查询的合约地址
        this.ct = data.ct; // 查询时间
        this.value = new BigNumber(data.value); // 查询时付的费用
    } else {
        this.user = "";
        this.caddr = "";
        this.ct = 0;
        this.value = new BigNumber(0);
    }
};

QueryItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var QueryAPI = function () {
    LocalContractStorage.defineMapProperty(this, "config", {
        parse: function (data) {
            return JSON.parse(data);
        },
        stringify: function (o) {
            return JSON.stringify(o);
        }
    });

    // 存储查询人查询记录
    LocalContractStorage.defineMapProperty(this, "queryItem", {
        parse: function (data) {
            return new QueryItem(data);
        },
        stringify: function (o) {
            return JSON.stringify(o);
        }

    });

    // 存储曾经查询过的合约地址，是个列表
    LocalContractStorage.defineMapProperty(this, "caddrList", {
        parse: function (data) {
            return JSON.parse(data);
        },
        stringify: function (o) {
            return JSON.stringify(o);
        }
    });
};


QueryAPI.prototype = {
    init: function () {
        var admin = "n1UkzP977VGbsPth7rQqaMDnVCGUtRUzCPY";
        var fee = new BigNumber(0); // 默认不要手续费，可以修改
        var totalFeeAmt = new BigNumber(0); // 总的收到的金额
        var totalBalance = new BigNumber(0); // 未提取的金额

        this.config.set('admin', admin);
        this.config.set('fee', fee);
        this.config.set('totalFeeAmt', totalFeeAmt);
        this.config.set('totalBalance', totalBalance);
    },

    getAdmin: function () {
        return this.config.get('admin');
    },

    getBalance: function () {
        return this.config.get('totalBalance');
    },
    
    getTotalAmt: function () {
        return this.config.get('totalFeeAmt');
    },

    getContractInfo: function() {
        var admin = this.config.get('admin');
        var fee = this.config.get('fee');
        var balance = this.config.get('totalBalance');
        var totalAmt = this.config.get('totalFeeAmt');

        var ret = new Object();
        ret.admin = admin;
        ret.fee = fee;
        ret.balance = balance;
        ret.totalAmt = totalAmt;
        return ret;
    },
    
    getFee: function () {
        return this.config.get('fee');
    },
    
    setFee: function (fee) {
        var from = Blockchain.transaction.from;
        var admin = this.config.get('admin');
        if (from != admin) {
            return false; // 非管理不允许操作，提示信息又前端给出，比如非管理员不允许操作
        }

        this.config.set('fee', fee);
        return true;
    },

    // 记录查询人
    saveQuery: function (caddr) {
        var from = Blockchain.transaction.from;
        var fee = this.config.get('fee');
        fee = new BigNumber(fee);
        var payfee = Blockchain.transaction.value;
        payfee = new BigNumber(payfee);

        if(payfee < fee) {
            return false; // 手续费不足，不允许查询
        }

        var qitem = new QueryItem();
        qitem.user = from;
        qitem.caddr = caddr;
        qitem.value = payfee;
        qitem.ct = Date.now();

        this.queryItem.set(caddr, qitem);

        var caddrList = this.caddrList.get('ALLQUERY') || [];
        if(caddrList.indexOf(caddr) == -1) {
            caddrList.push(caddr);
            this.caddrList.set('ALLQUERY', caddrList);
        }

        if(payfee > 0) {
            var balance = this.config.get('totalBalance');
            balance = new BigNumber(balance).plus(payfee);
            this.config.set('totalBalance', balance);

            var totalFeeAmt = this.config.get('totalFeeAmt');
            totalFeeAmt = new BigNumber(totalFeeAmt).plus(payfee);
            this.config.set('totalFeeAmt', totalFeeAmt);
        }

        return true;
    },

    // 检查用户是否已支付此次查询
    userPayedThisQuery: function (caddr) {
        var from = Blockchain.transaction.from;
        var item = this.queryItem.get(caddr);

        if(item == null) {
            return false;
        }

        if(item.user != from) {
            return false;
        }

        return true;
    },

    // 获取所有的查询记录
    getAllQueryCaddr: function () {
        return this.caddrList.get('ALLQUERY');
    },

    // 提取余额
    withDraw: function () {
        var from = Blockchain.transaction.from;
        var admin = this.config.get('admin');
        if(from != admin) {
            return false;
        }

        var balance = new BigNumber(this.config.get('totalBalance'));

        Blockchain.transfer(admin, balance);
        balance = new BigNumber(0);
        this.config.set('totalBalance', balance);

        return true;
    },

    // 提取意外金额
    withOppsAmt: function (amt) {
        var from = Blockchain.transaction.from;
        var admin = this.config.get('admin');
        if(from != admin) {
            return false;
        }

        amt = new BigNumber(amt);

        Blockchain.transfer(admin, amt);
        return true;
    }
};

module.exports = QueryAPI;