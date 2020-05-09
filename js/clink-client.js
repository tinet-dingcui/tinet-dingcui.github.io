"use strict";
/**
 *  clink toolbar
 *  @author wangll
 *  @date 2018/07/02 14:09:50
 */
var ClinkAgent = (function (identifier, websocketUrl) {

    /**
     * 工具条对接到客户系统，如果客户系统是https协议，工具条发起http请求会报错
     */
    if (document.location.protocol === "https:") {
        websocketUrl = websocketUrl.replace("http:", "https:")
    }

    var module_version = "0.0.1";

    function ClinkClient() {
    }

    /**
     * 浏览器控制台日志输出
     */
    var logger = (function () {

        function logger() {
        }

        var LEVEL = {
            DEBUG: "", INFO: "blue", WARN: "orange", ERROR: "red"
        };

        logger.debug = function (message) {
            if (GLOBAL.debug) {
                print(message, LEVEL.DEBUG);
            }
        };

        logger.info = function (message) {
            print(message, LEVEL.INFO);
        };

        logger.warn = function (message) {
            print(message, LEVEL.WARN);
        };

        logger.error = function (message) {
            print(message, LEVEL.ERROR);
        };

        logger.log = function (message, color) {
            if (GLOBAL.debug) {
                print(message, color);
            }
        };

        var print = function (message, color) {

            var time = new Date().toJSON();

            if (typeof color !== 'undefined') {
                color = 'color:' + color;
            }

            if (typeof window !== 'undefined' && window !== null && window.console !== null) {
                window.console.log('%c' + "[" + time + "] " + message, color);
            }
        };

        return logger;

    })();

    if (!identifier) {
        logger.error("can not run toolbar without identifier!");
    }

    if (!websocketUrl) {
        logger.error("can not run toolbar without websocketRoot!");
    }

    // 重写onbeforeunload方法在浏览器关闭时登出座席
    window.onbeforeunload = function () {

        logger.debug("window.onbeforeunload: window关闭");

        if (GLOBAL.connected && !GLOBAL.logout) {
            if (Agent.getBindType() === 3) {
                SipPhone.sipUnRegister();
            }

            var params = {};
            params.logoutMode = 1;
            ClinkAgent.logout(params);
        }
    };

    //自定义JSON对象防止某些浏览器没有JSON对象
    (function () {
        if (!window.JSON) {
            logger.warn("window has no object: JSON!");
            window.JSON = {};
        }

        function f(n) {
            return n < 10 ? '0' + n : n;
        }

        if (typeof Date.prototype.toJSON !== 'function') {
            Date.prototype.toJSON = function (key) {
                return isFinite(this.valueOf()) ? this.getUTCFullYear() + '-' + f(this.getUTCMonth() + 1) + '-'
                    + f(this.getUTCDate()) + 'T' + f(this.getUTCHours()) + ':' + f(this.getUTCMinutes()) + ':'
                    + f(this.getUTCSeconds()) + 'Z' : null;
            };
            String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
        }
        var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            gap, indent,
            meta = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\'}, rep;

        function quote(string) {
            escapable.lastIndex = 0;
            return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' : '"' + string + '"';
        }

        function str(key, holder) {
            var i, k, v, length, mind = gap, partial, value = holder[key];
            if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }
            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }
            switch (typeof value) {
                case'string':
                    return quote(value);
                case'number':
                    return isFinite(value) ? String(value) : 'null';
                case'boolean':
                case'null':
                    return String(value);
                case'object':
                    if (!value) {
                        return 'null';
                    }
                    gap += indent;
                    partial = [];
                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            partial[i] = str(i, value) || 'null';
                        }
                        v = partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
                        gap = mind;
                        return v;
                    }
                    if (rep && typeof rep === 'object') {
                        length = rep.length;
                        for (i = 0; i < length; i += 1) {
                            k = rep[i];
                            if (typeof k === 'string') {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                    } else {
                        for (k in value) {
                            if (Object.hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                    }
                    v = partial.length === 0 ? '{}' : gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' : '{' + partial.join(',') + '}';
                    gap = mind;
                    return v;
            }
        }

        if (typeof JSON.stringify !== 'function') {
            JSON.stringify = function (value, replacer, space) {
                var i;
                gap = '';
                indent = '';
                if (typeof space === 'number') {
                    for (i = 0; i < space; i += 1) {
                        indent += ' ';
                    }
                } else if (typeof space === 'string') {
                    indent = space;
                }
                rep = replacer;
                if (replacer && typeof replacer !== 'function' && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
                    throw new Error('JSON.stringify');
                }
                return str('', {'': value});
            };
        }
        if (typeof JSON.parse !== 'function') {
            JSON.parse = function (text, reviver) {
                var j;

                function walk(holder, key) {
                    var k, v, value = holder[key];
                    if (value && typeof value === 'object') {
                        for (k in value) {
                            if (Object.hasOwnProperty.call(value, k)) {
                                v = walk(value, k);
                                if (v !== undefined) {
                                    value[k] = v;
                                } else {
                                    delete value[k];
                                }
                            }
                        }
                    }
                    return reviver.call(holder, key, value);
                }

                text = String(text);
                cx.lastIndex = 0;
                if (cx.test(text)) {
                    text = text.replace(cx, function (a) {
                        return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    });
                }
                if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
                    j = eval('(' + text + ')');
                    return typeof reviver === 'function' ? walk({'': j}, '') : j;
                }
                throw new SyntaxError('JSON.parse');
            };
        }
    })();

    // 定义事件类型
    var EVENT_TYPE = (function () {

        function EVENT_TYPE() {

        }

        EVENT_TYPE.STATUS = "status";//座席状态
        EVENT_TYPE.PREVIEW_OUTCALL = "previewOutcall"; // 预览外呼
        EVENT_TYPE.PREVIEW_OUTCALL_START = "previewOutcallStart"; // 预览外呼开始呼叫客户
        EVENT_TYPE.PREVIEW_OUTCALL_RINGING = "previewOutcallRinging"; //预览外呼客户响铃
        EVENT_TYPE.PREVIEW_OUTCALL_BRIDGE = "previewOutcallBridge"; // 预览外呼客户接听
        EVENT_TYPE.CONSULT_START = "consultStart"; // 咨询开始
        EVENT_TYPE.CONSULT_LINK = "consultLink"; // 咨询接听
        EVENT_TYPE.UNCONSULT = "unconsult"; //  咨询挂断
        EVENT_TYPE.CONSULT_ERROR = "consultError"; // 咨询错误
        EVENT_TYPE.CONSULT_THREEWAY = "consultThreeway"; // 咨询三方
        EVENT_TYPE.CONSULT_THREEWAY_UNLINK = "consultThreewayUnlink"; // 咨询三方挂断
        EVENT_TYPE.CONSULT_TRANSFER = "consultTransfer"; // 咨询转接
        EVENT_TYPE.RINGING = "ringing"; // 响铃事件
        EVENT_TYPE.PREVIEW_OUTCALL = "previewOutcall"; //  预览外呼
        EVENT_TYPE.KICKOUT = "kickout"; // 被踢下线
        EVENT_TYPE.BREAK_LINE = "breakLine"; //断线
        EVENT_TYPE.INTERACT_RETURN = "interactReturn"; // 交互返回
        // 李志颖start
        EVENT_TYPE.QUEUE_STATUS = "queueStatus"; // 队列状态
        EVENT_TYPE.CHAT_BRIDGE = "chatBridge"; // 会话接通
        EVENT_TYPE.CHAT_OFFLINE = "chatOffline"; // 访客离线
        EVENT_TYPE.CHAT_TRANSFER = "chatTransfer"; // 会话转接
        EVENT_TYPE.CHAT_INVESTIGATION = "chatInvestigation"; //会话状态变为满意度
        // 李志颖end
        return EVENT_TYPE;
    })();

    // 定义响应类型
    var RESPONSE_TYPE = (function () {

        function RESPONSE_TYPE() {

        }

        /**
         * 登录
         * @type {string}
         */
        RESPONSE_TYPE.LOGIN = "login";
        /**
         * 登出
         * @type {string}
         */
        RESPONSE_TYPE.LOGOUT = "logout";
        /**
         * 队列状态
         * @type {string}
         */
        RESPONSE_TYPE.QUEUE_STATUS = "queueStatus";
        /**
         * 置忙
         * @type {string}
         */
        RESPONSE_TYPE.PAUSE = "pause";
        /**
         * 置闲
         * @type {string}
         */
        RESPONSE_TYPE.UNPAUSE = "unPause";
        /**
         * 座席状态
         * @type {string}
         */
        RESPONSE_TYPE.STATUS = "status";
        /**
         * 预览外呼
         * @type {string}
         */
        RESPONSE_TYPE.PREVIEW_OUTCALL = "previewOutcall";
        /**
         * 主叫外呼
         * @type {string}
         */
        RESPONSE_TYPE.DIRECT_CALL_START = "directCallStart";
        /**
         * 修改绑定电话
         * @type {string}
         */
        RESPONSE_TYPE.CHANGE_BIND_TEL = "changeBindTel";
        /**
         * 设置Tag
         * @type {string}
         */
        RESPONSE_TYPE.SET_CDR_TAG = "setCdrTag";
        /**
         * 延长整理
         * @type {string}
         */
        RESPONSE_TYPE.PROLONG_WRAPUP = "prolongWrapup";
        /**
         * 挂断
         * @type {string}
         */
        RESPONSE_TYPE.UNLINK = "unlink";
        /**
         * 外呼取消
         * @type {string}
         */
        RESPONSE_TYPE.PREVIEW_OUTCALL_CANCEL = "previewOutcallCancel";
        /**
         * 保持
         * @type {string}
         */
        RESPONSE_TYPE.HOLD = "hold";
        /**
         * 取消保持
         * @type {string}
         */
        RESPONSE_TYPE.UNHOLD = "unhold";
        /**
         * 咨询
         * @type {string}
         */
        RESPONSE_TYPE.CONSULT = "consult";
        /**
         * 咨询取消
         * @type {string}
         */
        RESPONSE_TYPE.CONSULT_CANCEL = "consultCancel";
        /**
         * 咨询转移
         * @type {string}
         */
        RESPONSE_TYPE.CONSULT_TRANSFER = "consultTransfer";
        /**
         * 咨询取消
         * @type {string}
         */
        RESPONSE_TYPE.UNCONSULT = "unconsult";
        /**
         * 转移
         * @type {string}
         */
        RESPONSE_TYPE.TRANSFER = "transfer";
        /**
         * 交互
         * @type {string}
         */
        RESPONSE_TYPE.INTERACT = "interact";
        /**
         * 满意度
         * @type {string}
         */
        RESPONSE_TYPE.INVESTIGATION = "investigation";
        /**
         * 拒接
         * @type {string}
         */
        RESPONSE_TYPE.REFUSE = "refuse";
        /**
         * 静音
         * @type {string}
         */
        RESPONSE_TYPE.MUTE = "mute";
        /**
         * 取消静音
         * @type {string}
         */
        RESPONSE_TYPE.UNMUTE = "unmute";
        /**
         * 设置随路数据
         * @type {string}
         */
        RESPONSE_TYPE.SET_USER_DATA = "setUserData";
        /**
         * 获取随路数据
         * @type {string}
         */
        RESPONSE_TYPE.GET_USER_DATA = "getUserData";
        /**
         * 发送按键
         * @type {string}
         */
        RESPONSE_TYPE.DTMF = "dtmf";
        /**
         * 录音回放
         * @type {string}
         */
        RESPONSE_TYPE.CONTROL_PLAYBACK = "controlPlayback";
        /**
         * 发送验证码
         * @type {string}
         */
        RESPONSE_TYPE.SEND_VERIFICATION_CODE = "sendVerificationCode";
        /**
         * 软电话外呼
         * @type {string}
         */
        RESPONSE_TYPE.SIP_CALL = "sipCall";
        /**
         * sip接听
         * @type {string}
         */
        RESPONSE_TYPE.SIP_LINK = "sipLink";
        /**
         * sip挂断
         * @type {string}
         */
        RESPONSE_TYPE.SIP_UNLINK = "sipUnlink";
        /**
         * sip发送按键
         * @type {string}
         */
        RESPONSE_TYPE.SIP_DTMF = "sipDTMF";
        // 李志颖start
        /**
         * ping
         * 获取网路延迟
         * @type {string}
         */
        RESPONSE_TYPE.PING = "ping";

        /**
         * 收到消息
         * @type {string}
         */
        RESPONSE_TYPE.CHAT_MESSAGE = "chatMessage";

        /**
         * 转移事件
         * @type {string}
         */
        RESPONSE_TYPE.CHAT_TRANSFER = "chatTransfer";

        /**
         * 关闭会话
         * @type {string}
         */
        RESPONSE_TYPE.CHAT_CLOSE = "chatClose";
         // 李志颖end
        return RESPONSE_TYPE;
    })();

    /**
     * 加载websocket协议使用的js
     */
    var script = [
        {"url": "/sockjs.js", "version": module_version},
        {"url": "/stomp.js", "version": module_version}
    ];
    /**
     * 加载flashbridge js文件，当为IE浏览器时加载
     */
    var flashScript = [
        {"url": "/flashbridge/swfobject.js", "version": module_version},
        {"url": "/flashbridge/web_socket.js", "version": module_version}
    ];
    /**
     * 加载软电话使用的js，当sipPhone为true时加载
     */
    var sipScript = [
        {"url": "/sipjs/adapter-latest.js", "version": module_version},
        {"url": "/sipjs/sip-0.7.7.js", "version": module_version}
    ];
    /**
     * 加载软电话使用的wav，当sipPhone为true时加载
     */
    var sipAudio = [
        {"id": "ringtone", "url": "/sipjs/sounds/ringtone.wav", "version": module_version},
        {"id": "ringbacktone", "url": "/sipjs/sounds/ringbacktone.wav", "version": module_version},
        {"id": "dtmfTone", "url": "/sipjs/sounds/dtmf.wav", "version": module_version},
        {"id": "startTone", "url": "/sipjs/sounds/start.wav", "version": module_version},
        {"id": "hangupTone", "url": "/sipjs/sounds/hangup.wav", "version": module_version}
    ];

    /**
     * 内部全局变量
     */
    var GLOBAL = {
        ready: false,
        debug: false,  // 是否开启debug
        sipPhone: false,  // 是否是webrtc
        connecting: false, //建立连接中
        connected: false,  // 是否建立websocket连接
        connectionCloseCount: 0,  // 连接断开次数
        sessionId: '',
        lastPingTime: null, // 上次ping时间

        logout: false,
        connectInterval: 1000,  //建立连接的时间间隔, 默认1秒
        // 李志颖start
        pingTimer: '',
        // 李志颖end
        latency: 0, // 网络时延
        pingValue: false, // 检测断线
        randoms: 0,
        identifier: identifier,
        webSocketUrl: websocketUrl
    };

    /**
     * Agent对象, 存储座席的信息
     */
    var Agent = (function (params) {

        function Agent() {

        }

        var _sessionKey;
        var _identifier; // 企业编号
        var _enterpriseId; //企业ID
        var _cno; //座席号
        var _bindType; //绑定电话类型
        var _bindTel; //绑定电话
        var _qids; //队列ID
        var _loginStatus; //登录状态
        var _pauseDescription;
        var _webSocketUrl;
        var _sipIp; //软电话IP
        var _sipPwd; //软电话密码
        var _webrtcSocketUrl;
        var _webrtcStunServer;
        var _webrtcAutoAnswer;
        var _debug;
        var _token;
        // 李志颖start
        var _type;//座席类型 1：全渠道、2：呼叫中心、3：在线客服
        var _chatLoginStatus; //在线客服登录状态，1，空闲 2，忙碌
        var _chatPauseDescription; //在线客服的致盲原因
        // 李志颖end
        Agent.init = function (params) {
            _sessionKey = params.sessionKey;
            _identifier = params.identifier; // 企业编号
            _enterpriseId = Number(params.enterpriseId); //企业ID
            _cno = params.cno; //座席号
            _bindType = params.bindType; //绑定电话类型
            _bindTel = params.bindTel; //绑定电话
            _qids = params.qids; //队列ID
            _loginStatus = params.loginStatus; //登录状态
            _pauseDescription = params.pauseDescription;
            _webSocketUrl = params.webSocketUrl;
            _sipIp = params.sipIp; //软电话IP
            _sipPwd = params.sipPwd; //软电话密码
            _webrtcSocketUrl = params.webrtcSocketUrl;
            _webrtcStunServer = params.webrtcStunServer;
            _webrtcAutoAnswer = params.webrtcAutoAnswer;
            _debug = params.debug;
            _token = params.token;
            // 李志颖start
            _type = params.type;//座席类型 1：全渠道、2：呼叫中心、3：在线客服
            _chatLoginStatus = params.chatLoginStatus; //在线客服登录状态，1，空闲 2，忙碌
            _chatPauseDescription = params.chatPauseDescription;
            // 李志颖end
            return Agent;
        };

        Agent.setSessionKey = function (sessionKey) {
            _sessionKey = sessionKey;
        };
        Agent.getSessionKey = function () {
            return _sessionKey;
        };
        Agent.getEnterpriseId = function () {//企业ID
            return _enterpriseId;
        };
        Agent.setEnterpriseId = function (enterpriseId) {//企业ID
            _enterpriseId = enterpriseId;
        };
        Agent.getIdentifier = function () {
            return _identifier;
        };

        Agent.setIdentifier = function (identifier) {
            _identifier = identifier;
        };

        Agent.setCno = function (cno) {
            _cno = cno;
        };
        Agent.getCno = function () {//座席号
            return _cno;
        };
        Agent.setBindType = function (bindType) {//绑定电话类型
            _bindType = bindType;
        };
        Agent.getBindType = function () {//绑定电话类型
            return _bindType;
        };
        Agent.setBindTel = function (bindTel) {//绑定电话
            _bindTel = bindTel;
        };
        Agent.getBindTel = function () {//绑定电话类型
            return _bindTel;
        };
        Agent.getQids = function () {// 企业ID
            return _qids;
        };
        Agent.setQids = function (qids) {// 企业ID
            _qids = qids;
        };
        Agent.setLoginStatus = function (loginStatus) {//登陆状态
            _loginStatus = loginStatus;
        };
        Agent.getLoginStatus = function () {//登陆状态
            return _loginStatus;
        };
        Agent.setPauseDescription = function (pauseDescription) {//
            _pauseDescription = pauseDescription;
        };
        Agent.getPauseDescription = function () {//
            return _pauseDescription;
        };
        Agent.getWebSocketUrl = function () {//websocketurl
            return _webSocketUrl;
        };
        Agent.setWebSocketUrl = function (webSocketUrl) {//websocketurl
            _webSocketUrl = webSocketUrl;
        };
        Agent.setSipIp = function (sipIp) {//软电话IP
            _sipIp = sipIp;
        };
        Agent.getSipIp = function () {//软电话IP
            return _sipIp;
        };
        Agent.setSipPwd = function (sipPwd) {//软电话密码
            _sipPwd = sipPwd;
        };
        Agent.getSipPwd = function () {//软电话密码
            return _sipPwd;
        };
        Agent.getWebrtcSocketUrl = function () {//sipPhone
            return _webrtcSocketUrl;
        };
        Agent.setWebrtcSocketUrl = function (webrtcSocketUrl) {//sipPhone
            _webrtcSocketUrl = webrtcSocketUrl;
        };
        Agent.getWebrtcStunServer = function () {//stun
            return _webrtcStunServer;
        };
        Agent.setWebrtcStunServer = function (webrtcStunServer) {//stun
            _webrtcStunServer = webrtcStunServer;
        };
        Agent.getWebrtcAutoAnswer = function () {
            return _webrtcAutoAnswer;
        };
        Agent.setWebrtcAutoAnswer = function (webrtcAutoAnswer) {
            _webrtcAutoAnswer = webrtcAutoAnswer;
        };
        Agent.setDebug = function (debug) {
            _debug = debug;
        };
        Agent.getDebug = function () {
            return _debug;
        };

        Agent.getToken = function () {
            return _token;
        };
        // 李志颖start
        Agent.setType = function (type) {
            _type = type;
        };

        Agent.getType = function () {
            return _type;
        };

        Agent.setChatLoginStatus = function (chatLoginStatus) {
            _chatLoginStatus = chatLoginStatus;
        };

        Agent.getChatLoginStatus = function () {
            return _chatLoginStatus;
        };

        Agent.setChatPauseDescription = function (chatPauseDescription) {
            _chatPauseDescription = chatPauseDescription;
        };

        Agent.getChatPauseDescription = function () {
            return _chatPauseDescription;
        };
        // 李志颖end

        return Agent;
    })();

    // 公共方法
    var Util = (function () {
        function Util() {
        }

        /**
         * 加载js文件
         * @param urls
         * @param i
         * @param callback
         */
        Util.loadScript = function (urls, i, callback) {

            if (i === urls.length) {

                logger.debug("Util.loadScript: JS file is loaded [" + JSON.stringify(urls) + "]");

                if (Util.isFunction(GLOBAL.callback)) {
                    GLOBAL.callback();
                } else if (Util.isFunction(callback)) {
                    callback();
                }

                GLOBAL.ready = true;
                return;
            }

            var oHead = document.getElementsByTagName("head").item(0);

            var oScript = document.createElement("script");
            oScript.type = "text/javascript";
            oScript.src = GLOBAL.webSocketUrl + urls[i].url + "?version=" + urls[i].version;
            oScript.charset = "UTF-8";

            oHead.appendChild(oScript);

            if (oScript.readyState) { // IE

                oScript.onreadystatechange = function () {
                    if (oScript.readyState === "loaded" || oScript.readyState === "complete") {
                        oScript.onreadystatechange = null;
                        Util.loadScript(urls, i + 1, callback);
                    }
                };
            } else { // Other

                oScript.onload = function () {
                    Util.loadScript(urls, i + 1, callback);
                };
            }


        };

        /**
         *  加载媒体文件
         * @param urls
         * @param i
         */
        Util.loadAudio = function (urls, i) {
            if (i === urls.length) {
                logger.debug("loadAudio: SipAudio file is loaded [" + JSON.stringify(urls) + "]");
                return;
            }

            // 由于js是放在head中的 因此js加载时body标签不一定渲染出来了，因此做了个容错
            var oBody;
            if (!oBody) {
                var getBodyInterval = setInterval(function () {

                    oBody = window.document.getElementsByTagName("body").item(0);
                    if (oBody) {
                        clearInterval(getBodyInterval);

                        var exist = document.getElementById("audio_remote");
                        if (!exist) {
                            var oAudio = document.createElement("audio");
                            oAudio.id = "audio_remote";
                            oAudio.autoplay = "autoplay";
                            oAudio.style = "display: none";
                            oBody.appendChild(oAudio);
                        }

                        var oHead = document.getElementsByTagName('head').item(0);
                        exist = document.getElementById(urls[i].id);
                        if (exist) {
                            return;
                        }
                        var oScript = document.createElement("audio");
                        oScript.id = urls[i].id;
                        if (urls[i].id === "ringtone" || urls[i].id === "ringbacktone") {
                            oScript.loop = "loop";
                        }
                        oScript.src = GLOBAL.webSocketUrl + urls[i].url;
                        oHead.appendChild(oScript);
                        oScript.addEventListener("canplaythrough", function () {
                            Util.loadAudio(urls, i + 1);
                        });

                    }

                }, 200);
            }
        };

        /**
         * 判断浏览器类型
         */
        Util.isIE = (function () {
            var browser = {};
            return function (ver, c) {
                var key = ver ? ( c ? "is" + c + "IE" + ver : "isIE" + ver ) : "isIE";
                var v = browser[key];
                if (typeof(v) !== "undefined") {
                    return v;
                }
                if (!ver) {
                    v = (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0);
                } else {
                    var match = navigator.userAgent.match(/(?:MSIE |Trident\/.*; rv:|Edge\/)(\d+)/);
                    if (match) {
                        var v1 = parseInt(match[1]);
                        v = c ? ( c === 'lt' ? v1 < ver : ( c === 'gt' ? v1 > ver : undefined ) ) : v1 === ver;
                    } else if (ver <= 9) {
                        var b = document.createElement('b');
                        b.innerHTML = '<!--[if ' + (c ? c : '') + ' IE ' + ver + ']><i></i><![endif]-->';
                        v = b.getElementsByTagName('i').length === 1;
                    } else {
                        v = undefined;
                    }
                }
                browser[key] = v;
                return v;
            };
        }());

        //随机数字
        Util.randomNumber = function (n) {
            return Math.floor(Math.random() * n + 5);
        };

        Util.isFunction = function (arg) {
            return typeof arg === 'function';
        };
        Util.isNumber = function (arg) {
            return typeof arg === 'number';
        };

        Util.isUndefined = function (arg) {
            return arg === void 0;
        };

        Util.isEmpty = function (arg) {
            return JSON.stringify(arg) === "{}";
        };

        Util.randomString = function (length) {
            var rdmString = "";
            //toSting接受的参数表示进制，默认为10进制。36进制为0-9 a-z
            while (rdmString.length < length) {
                rdmString += Math.random().toString(36).substr(2);
            }
            return rdmString.substr(0, length);
        };

        Util.generateSessionId = function () {
            GLOBAL.sessionId = Util.randomString(10);
            return GLOBAL.sessionId;
        };

        /**
         * 使用javascript原生XMLHttpRequest实现jquery ajax功能，支持jsonp
         */
        Util.ajax = function (params) {

            params = params || {};
            params.data = params.data || {};

            switch (params.dataType) {
                case "jsonp":
                    jsonp(params);
                    break;
                case "json":
                    json(params);
                    break;
                default:
                    logger.error("function ajax only support json and jsonp dataType!");
                    break;
            }

            // ajax请求
            function json(params) {
                params.type = (params.type || 'GET').toUpperCase();
                params.data = formatParams(params.data);
                var xhr = null;
                // 实例化XMLHttpRequest对象
                if (window.XMLHttpRequest) {
                    xhr = new XMLHttpRequest();
                } else {
                    // IE6及其以下版本
                    xhr = new ActiveXObjcet('Microsoft.XMLHTTP');
                }

                // 监听事件
                xhr.onReadyStateChange = function () {

                    if (xhr.readyState === 4) {

                        var status = xhr.status;

                        if (status >= 200 && status < 300) {

                            var response = "";
                            var type = xhr.getResponseHeader('Content-type');
                            if (type.indexOf('xml') !== -1 && xhr.responseXML) {
                                //Document对象响应
                                response = xhr.responseXML;
                            } else if (type === 'application/json') {
                                //JSON响应
                                if (this.JSON) {
                                    response = this.JSON.parse(xhr.responseText);
                                } else {
                                    response = eval("(" + xhr.responseText + ")");
                                }
                            } else {
                                //字符串响应
                                response = xhr.responseText;
                            }
                            params.success && params.success(response);
                        } else {
                            params.error && params.error(status);
                        }
                    } else {
                        logger.debug("state: " + xhr.readyState);
                    }
                };

                switch (params.type) {
                    case "GET":
                        xhr.open(params.type, params.url + '?' + params.data, true);
                        xhr.send(null);
                        break;
                    case "POST":
                        xhr.open(params.type, params.url, true);
                        //设置提交时的内容类型
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                        xhr.send(params.data);
                        break;
                    default:
                        logger.error("function json only support GET and POST type!");
                        break;
                }
            }

            // jsonp请求
            function jsonp(params) {
                //创建script标签并加入到页面中
                var callbackName = params.jsonp + "_" + new Date().getTime();
                var head = document.getElementsByTagName('head')[0];
                // 设置传递给后台的回调参数名
                params.data['callback'] = callbackName;
                var data = formatParams(params.data);
                var script = document.createElement('script');
                head.appendChild(script);

                //创建jsonp回调函数
                window[callbackName] = function (json) {
                    head.removeChild(script);
                    clearTimeout(script.timer);
                    window[callbackName] = null;
                    params.success && params.success(json);
                };

                //发送请求
                script.src = params.url + '?' + data;

                //超时处理
                if (params.time) {
                    script.timer = setTimeout(function () {
                        window[callbackName] = null;
                        head.removeChild(script);
                        params.error && params.error({
                            message: 'jsonp request time out!'
                        });
                    }, params.time);
                }
            }

            //格式化参数
            function formatParams(data) {
                var arr = [];
                for (var name in data) {
                    if (data.hasOwnProperty(name)) {
                        arr.push(name + '=' + data[name]);
                    }
                }
                // 添加一个随机数，防止缓存
                arr.push('t=' + new Date().getTime());
                return arr.join('&');
            }
        };

        return Util;
    })();

    //IE浏览器,在没有window.WebSocket对象时 加载flash对WebSocket的支持
    if (Util.isIE()) {

        logger.debug("Flash: IE load flash-bridge");

        window.WEB_SOCKET_SWF_LOCATION = GLOBAL.webSocketUrl + "/flashbridge/WebSocketMainInsecure.swf?t="
            + new Date().getTime();
        window.WEB_SOCKET_DEBUG = GLOBAL.debug;
        //加载flash
        script = flashScript.concat(script);
    }

    // 调用方法加载js文件
    Util.loadScript(script, 0);
    /**
     * WebSocketClient对象，提供与websocket服务器的通讯、广播订阅服务
     */
    var WebSocketClient = (function () {

        function WebSocketClient() {
        }

        var options = {
            OnOpen: function (token) {
                logger.debug("ClinkAgent.options.OnOpen: 连接成功");
                GLOBAL.logout = false;
                //断线重连, 连接成功后, 发送消息
                if (GLOBAL.connectionCloseCount > 0) {

                    GLOBAL.randoms = Util.randomNumber('5');

                    var objMsg = {};
                    objMsg.type = "event";
                    // 李志颖start
                    objMsg.event = "breakLine";
                    // 李志颖end
                    objMsg.enterpriseId = Agent.getEnterpriseId();
                    objMsg.cno = Agent.getCno();
                    objMsg.msg = 'open';
                    objMsg.code = 0;
                    objMsg.randoms = GLOBAL.randoms;

                    Event.invoke(EVENT_TYPE.BREAK_LINE, objMsg);
                }
                GLOBAL.randoms = 0;
                GLOBAL.connectionCloseCount = 0;
            },
            OnMessage: function (token) {

                if (token.type === 'response') {
                    logger.log("ClinkAgent.options.OnMessage: 收到响应, " + JSON.stringify(token), "green");
                } else if (token.type === 'event') {
                    logger.log("ClinkAgent.options.OnMessage: 收到事件, " + JSON.stringify(token), "blue");
                } else {
                    logger.log("ClinkAgent.options.OnMessage: 收到其他, " + JSON.stringify(token), "grey");
                }
            },
            OnClose: function (token) {

                if (GLOBAL.logout === false) {

                    GLOBAL.connectionCloseCount = GLOBAL.connectionCloseCount + 1;
                    GLOBAL.randoms = Util.randomNumber('5');

                    var objMsg = {};
                    objMsg.type = "event";
                    // 李志颖start
                    objMsg.event = "breakLine";
                    // 李志颖end
                    objMsg.enterpriseId = Agent.getEnterpriseId();
                    objMsg.cno = Agent.getCno();
                    objMsg.msg = 'close';
                    objMsg.attempts = GLOBAL.connectionCloseCount;
                    objMsg.randoms = GLOBAL.randoms;
                    objMsg.code = -1;

                    Event.invoke(EVENT_TYPE.BREAK_LINE, objMsg);

                    logger.debug("ClinkAgent.options.OnClose: 连接断开");

                    CallConnect.autoReconnect();
                }
            }
        };

        /**
         * 建立连接
         */
        WebSocketClient.connect = function () {
            if (GLOBAL.connecting) {
                logger.warn("WebSocketClient.connect: connecting!");
                return;
            }
            GLOBAL.connecting = true;

            logger.debug("WebSocketClient.connect: connecting...");

            setTimeout(function () {
                GLOBAL.connecting = false;
            }, GLOBAL.connectInterval);


            var socketUrl;

            if (Util.isUndefined(Agent.getWebSocketUrl()) || Agent.getWebSocketUrl() === "") {
                if (GLOBAL.webSocketUrl.indexOf('/', 10) > 0) {
                    socketUrl = GLOBAL.webSocketUrl.substring(0, GLOBAL.webSocketUrl.indexOf('/', 10));
                } else {
                    socketUrl = GLOBAL.webSocketUrl;
                }
            } else {
                socketUrl = Agent.getWebSocketUrl();
            }


            if (socketUrl.toLocaleLowerCase().indexOf("http") === -1) {
                socketUrl = (location.protocol || "http:") + "//" + socketUrl;
            }
            //判断SockJs是否加载完成
            if (typeof SockJS === 'undefined') {
                logger.error("WebSocketClient.connect: SockJS object is undefined");
                return;
            }
            //判断Stomp是否加载完成
            if (typeof Stomp === 'undefined') {
                logger.error("WebSocketClient.connect: Stomp object is undefined");
                return;
            }

            if (Util.isIE()) {
                socketUrl = socketUrl + "/agent?token=" + Agent.getToken();
            } else {
                socketUrl = socketUrl + "/agent";
            }

            GLOBAL.sessionId = Util.randomString(10);

            var socket = new SockJS(socketUrl, {}, {sessionId: Util.generateSessionId});

            WebSocketClient.stompClient = Stomp.over(socket);

            //关闭日志
            WebSocketClient.stompClient.debug = function (message) {
                // console.log("stompClient.debug: ", message);
            };

            WebSocketClient.stompClient.connect({}, function () {
                if (GLOBAL.connected) {
                    logger.warn("WebSocketClient.connect: had bean connected!");
                    return;
                }

                logger.debug("WebSocketClient.connect: connect success!");


                if (typeof options.OnOpen === "function") {
                    options.OnOpen();
                }
                // 订阅属于自己的消息
                WebSocketClient.stompClient.subscribe('/user/agent', function (data) {
                    var response = JSON.parse(data.body);

                    if (typeof options.OnMessage === "function") {
                        options.OnMessage(response);
                    }

                    WebSocketClient.processToken(response);
                });
                // 订阅队列的消息
                if (!Util.isUndefined(Agent.getQids()) && Agent.getQids() !== '') {
                    WebSocketClient.stompClient.subscribe('/queue/' + Agent.getQids(),
                        function (data) {
                            var response = JSON.parse(data.body);

                            if (typeof options.OnMessage === "function") {
                                options.OnMessage(response);
                            }

                            WebSocketClient.processToken(response);
                        });
                }
                // 订阅企业全局的消息
                WebSocketClient.stompClient.subscribe('/enterprise/' + Agent.getEnterpriseId(), function (data) {
                    var response = JSON.parse(data.body);

                    if (typeof options.OnMessage === "function") {
                        options.OnMessage(response);
                    }

                    WebSocketClient.processToken(response);
                });

                WebSocketClient.sendToken({
                    type: "login",
                    enterpriseId: Agent.getEnterpriseId(),
                    cno: Agent.getCno(),
                    loginStatus: Agent.getLoginStatus(),
                    bindTel: Agent.getBindTel(),
                    bindType: Agent.getBindType(),
                    pauseDescription: Agent.getPauseDescription(),
                    webSocketUrl: GLOBAL.webSocketUrl,
                    loginType: 1
                });

                GLOBAL.connected = true;
                GLOBAL.connecting = false;

            }, function (error) {
                if (typeof options.OnClose === "function") {
                    options.OnClose();
                }

                GLOBAL.connected = false;
                GLOBAL.connecting = false;
                // 李志颖start
                    logger.error("错误码为:" + error.code);
                // 李志颖end
                logger.error(error);
            });
        };
        /**
         * 关闭连接
         */
        WebSocketClient.disconnect = function () {
            WebSocketClient.stompClient.disconnect();
            GLOBAL.connected = false;
        };
        /**
         * 向服务器发送消息
         *
         * @param token
         * @param headers
         */
        WebSocketClient.sendToken = function (token, headers) {

            headers = (headers === null ? {} : headers);
            WebSocketClient.stompClient.send("/app/agent/handle/" + token.type, headers, JSON.stringify(token));
        };
        /**
         * 处理返回消息
         * @param token 返回的消息内容
         */
        WebSocketClient.processToken = function (token) {
            var key;
            var callback;
            if (token.type === "response") {  //action的响应

                Response.clientResponseHandler(token);
                Response.invoke(token.reqType, token);

            } else if (token.type === "event") { //事件

                if (token.event === "kickout") {

                    logger.debug("WebSocketClient.processToken: kickout [GLOBAL.sessionId=" + GLOBAL.sessionId +
                        "][token.sessionId=" + token.sessionId + "]");

                    //断线重连被踢下线, 不处理
                    if (GLOBAL.sessionId !== token.sessionId) {

                        GLOBAL.logout = true;
                        GLOBAL.connected = false;
                        this.disconnect();
                        Event.invoke(EVENT_TYPE.KICKOUT, token);
                    }

                    return;

                } else if (token.event === "debug") {
                    if (token.debug === '1') {
                        Agent.setDebug(true);
                    } else {
                        Agent.setDebug(false);
                    }
                    return;
                } else if (token.event === "status") {
                    //不是当前座席的事件
                    if (token.enterpriseId !== Agent.getEnterpriseId() || token.cno !== Agent.getCno()) {

                        Event.invoke("queueStatus", token);
                        return;
                    }
                    // 李志颖start
                    if (token.code === "OFFLINE") {
                        // CallConnect.close();
                    }
                    // 李志颖end
                }

                Event.callSessionHandler(token);
                Event.invoke(token.event, token);
            } else {
                logger.debug(token);
            }
        };

        // 李志颖start
        /**
         * 在线客服发送消息
         * @param token
         * @param headers
         */
        WebSocketClient.chatSendToken = function (token, headers) {
            headers = (headers === null ? {} : headers);
            WebSocketClient.stompClient.send("/app/chat/handle/" + token.type, headers, JSON.stringify(token));
        }
        // 李志颖end

        /**
         * 连接成功后登录座席
         */
        WebSocketClient.login = function () {

            WebSocketClient.sendToken({
                type: "login",
                enterpriseId: Agent.getEnterpriseId(),
                cno: Agent.getCno(),
                loginStatus: Agent.getLoginStatus(),
                bindTel: Agent.getBindTel(),
                bindType: Agent.getBindType(),
                pauseDescription: Agent.getPauseDescription(),
                webSocketUrl: GLOBAL.webSocketUrl,
                loginType: 1
            });
        };
        WebSocketClient.debug = function (params) {
            WebSocketClient.sendToken({
                type: "debug",
                enterpriseId: Agent.getEnterpriseId(),
                cno: Agent.getCno(),
                message: params.message
            });
        };

        return WebSocketClient;
    })();
    /**
     * SipPhone对象，提供与软电话服务器通讯服务
     */
    var SipPhone = (function () {

        function SipPhone() {

        }

        var sipPhone;
        var currentSession;

        var eventHandler = function (token) {
            switch (token.name) {
                case "invite":
                    if (!CallSession.isSessionAlive()) {

                        logger.debug("Event.sipEventHandler: invite");
                        CallSession.init();
                    }
                    break;
                case "disconnected":

                    logger.debug("Event.sipEventHandler: disconnected");
                    CallSession.terminate();
                    break;
                case "failed":
                case "cancel":
                case "bye":
                    if (CallSession.isSessionAlive()) {

                        logger.debug("Event.sipEventHandler: bye");
                        CallSession.terminate();
                    }
                    break;
            }
        };

        SipPhone.sipRegister = function () {

            var level = 1;
            if (GLOBAL.debug) {
                level = 2;
            }

            try {
                sipPhone = new SIP.UA({
                    uri: 'sip:' + Agent.getEnterpriseId()
                        + Agent.getBindTel() + '@' + Agent.getSipIp(),
                    wsServers: [Agent.getWebrtcSocketUrl()],
                    authorizationUser: Agent.getEnterpriseId() + Agent.getBindTel(),
                    password: Agent.getSipPwd(),
                    register: true,
                    stunServers: "",
                    turnServers: Agent.getWebrtcStunServer(),
                    traceSip: true,
                    wsServerMaxReconnection: 3,
                    wsServerReconnectionTimeout: 4,
                    iceCheckingTimeout: 1000,
                    hackIpInContact: true,
                    log: {level: level}
                });
            } catch (e) {
                logger.error(e);
            }

            if (!sipPhone) {
                logger.error("SipPhone.sipRegister sipPhone is null");
                return;
            }

            sipPhone.on('disconnected', function () {
                eventHandler({name: "disconnected"});
            });

            sipPhone.on('invite', function (session) {

                eventHandler({name: "invite"});

                var autoAnswer = '0';
                if (session.transaction.request.headers['X-Asterisk-Call-Type'] !== undefined) {
                    var callType = session.transaction.request.headers['X-Asterisk-Call-Type'][0].raw;
                    if (callType === '3' || callType === '4' || callType === '5') {
                        autoAnswer = '1';
                    }
                    if (callType === '9') {
                        var autoAnswerCallTypeArray = Agent.getWebrtcAutoAnswer();
                        if (autoAnswerCallTypeArray !== undefined && autoAnswerCallTypeArray instanceof Array) {
                            if (autoAnswerCallTypeArray.indexOf(parseInt(callType)) !== -1) {
                                autoAnswer = '1';
                            }
                        }
                    }
                }
                if (autoAnswer === '1') {
                    setTimeout(function () {
                        try {
                            startTone.play();
                        } catch (e) {

                        }
                        session.accept({
                            media: {
                                constraints: {
                                    audio: true,
                                    video: false
                                },
                                render: {
                                    remote: document.getElementById("audio_remote")
                                }
                            }
                        });
                    }, 500);
                } else {
                    startRingTone();
                }

                currentSession = session;

                session.on('connecting', function (session) {
                    stopRingTone();
                });

                session.on('accepted', function () {
                    stopRingTone();
                });

                session.on('failed', function (session) {

                    eventHandler({name: "failed"});

                    stopRingTone();
                    currentSession = undefined;
                });

                session.on('cancel', function (session) {

                    eventHandler({name: "cancel"});

                    stopRingTone();
                    currentSession = undefined;
                });

                session.on('bye', function (session) {

                    eventHandler({name: "bye"});

                    currentSession = undefined;
                    try {
                        hangupTone.play();
                    } catch (e) {

                    }
                });

                session.on('rejected', function (session) {
                    currentSession = undefined;
                });

                session.on('terminated', function (session) {
                    currentSession = undefined;
                });
            });
        };
        SipPhone.isRegistered = function () {
            if (!sipPhone) {
                logger.error("SipPhone.isRegistered sipPhone is null");
                return false;
            }
            return sipPhone.isRegistered();
        };
        SipPhone.sipUnRegister = function () {
            if (!sipPhone) {
                logger.error("SipPhone.sipUnRegister sipPhone is null");
                return;
            }
            sipPhone.stop();
        };
        SipPhone.sipCall = function (number) {
            if (!sipPhone) {
                logger.error("SipPhone.sipCall sipPhone is null");
                return;
            }
            var session = sipPhone.invite(number, document.getElementById("audio_remote"));

            eventHandler({name: "invite"});

            currentSession = session;
            session.on('connecting', function (session) {
                stopRingTone();
            });
            session.on('accepted', function () {
                stopRingTone();
            });
            session.on('failed', function (session) {

                eventHandler({name: "failed"});

                stopRingTone();
                currentSession = undefined;
            });
            session.on('cancel', function (session) {

                eventHandler({name: "cancel"});

                stopRingTone();
                currentSession = undefined;
            });
            session.on('bye', function (session) {

                eventHandler({name: "bye"});

                currentSession = undefined;
                try {
                    hangupTone.play();
                } catch (e) {

                }
            });
            session.on('rejected', function (session) {
                currentSession = undefined;
            });
            session.on('terminated', function (session) {
                currentSession = undefined;
            });
        };
        SipPhone.sipAnswer = function () {
            currentSession.accept({
                media: {
                    constraints: {
                        audio: true,
                        video: false
                    },
                    render: {
                        remote: document.getElementById("audio_remote")
                    }
                }
            });
        };
        SipPhone.sipHangup = function () {
            currentSession.terminate();
        };
        SipPhone.sendDTMF = function (value) {
            if (currentSession !== undefined) {
                currentSession.dtmf(value);
                try {
                    dtmfTone.play();
                } catch (e) {

                }
            }
        };
        var startRingTone = function () {
            try {
                ringtone.play();
            } catch (e) {
            }
        };
        var stopRingTone = function () {
            try {
                ringtone.pause();
            } catch (e) {
            }
        };
        var startRingbackTone = function () {
            try {
                ringbacktone.play();
            } catch (e) {
            }
        };
        var stopRingbackTone = function () {
            try {
                ringbacktone.pause();
            } catch (e) {
            }
        };

        return SipPhone;
    })();

    /**
     * 通话时的会话对象，通话接通时创建、挂断时销毁
     */
    var CallSession = (function () {
        function CallSession() {
        }

        var alive = false;

        CallSession.init = function () {
            logger.debug("Session.init: session建立");

            alive = true;
        };

        CallSession.terminate = function () {
            logger.debug("Session.terminate: session销毁");
            alive = false;
        };

        CallSession.isSessionAlive = function () {
            return alive;
        };

        return CallSession;
    })();
    // 处理服务端广播事件监听
    var Event = (function () {

        function Event() {
        }

        // 维护通话会话状态
        Event.callSessionHandler = function (token) {
            if (token.event === "status") {
                //sessionInit，3：响铃、4：通话中
                if (token.deviceStatus === 3 || token.deviceStatus === 4) {

                    if (!CallSession.isSessionAlive()) {
                        CallSession.init();
                    }
                }
                //sessionTerminate
                if (token.deviceStatus === 9 || token.deviceStatus === 0 || token.deviceStatus === 1) {

                    if (CallSession.isSessionAlive()) {
                        CallSession.terminate();
                    }
                }
            } else if (token.event === "kickout") {  //踢下线事件, 座席退出

                if (CallSession.isSessionAlive()) {
                    CallSession.terminate();
                }

                var params = {};
                params.logoutMode = 0;  //被踢下线
                ClinkClient.logout(params);

            }
        };

        var eventListeners = {};

        Event.registerListener = function (type, listener) {
            if (Util.isUndefined(listener)) {
                return;
            }

            if (!Util.isFunction(listener))
                throw TypeError('listener must be a function');

            //一个action只能有一个callback
            eventListeners[type] = listener;
        };

        Event.removeListener = function (type) {
            if (eventListeners && eventListeners[type]) {
                delete eventListeners[type];
            } else {
                logger.warn("Event.removeListener failed: there is not event: [" + type + "]");
            }
        };

        Event.invoke = function (type, token) {
            if (Util.isFunction(eventListeners[type])) {
                eventListeners[type](token);
            } else {
                logger.debug("Event.invoke failed: there is not event: [" + type + "]");
            }
        };

        return Event;

    })();
    // 处理服务端请求响应回调
    var Response = (function () {
        function Response() {

        }

        var defaultType = {
            login: "login",
            kickout: "kickout",
            logout: "logout",
            changeBindTel: "changeBindTel",
            ping: "ping"
        };

        Response.clientResponseHandler = function (token) {
            switch (token.reqType) {
                case defaultType.login:
                    if (token.code === 0) {

                        if (token.isAgentDebug === '1') {
                            GLOBAL.isDebug = true;
                        }
                        if (GLOBAL.pingTimer !== '' && GLOBAL.pingTimer !== 'undefined') {
                            clearTimeout(GLOBAL.pingTimer);
                            GLOBAL.pingTimer = '';
                        }

                        CallConnect.ping();

                        //如果是软电话， 而且不是断线重连
                        if (token.values.bindType === 3 && token.loginStatus !== -1) {
                            //sipregister
                            Agent.setSipIp(token.values.sipIp);
                            Agent.setSipPwd(token.values.sipPwd);
                            Agent.setWebrtcSocketUrl(token.values.webrtcSocketUrl);
                            Agent.setWebrtcStunServer(token.values.webrtcStunServer);
                            Agent.setWebrtcAutoAnswer(token.values.webrtcAutoAnswer);

                            SipPhone.sipRegister();

                            //检查是否注册成功, 20次
                            var st = 1;
                            var objMsg = {};
                            var setSipIntervalId = setInterval(function () {
                                st++;
                                if (SipPhone.isRegistered()) {
                                    clearInterval(setSipIntervalId);
                                    objMsg.code = 0;
                                    objMsg.msg = '软电话注册成功';
                                    Event.invoke("login", objMsg);
                                }
                                if (st === 20) {
                                    clearInterval(setSipIntervalId);
                                    objMsg.code = -1;
                                    objMsg.msg = '软电话注册失败';
                                    Event.invoke("login", objMsg);
                                    logger.debug("软电话注册失败, 请退出重新登录");
                                }
                            }, 500);
                        }

                    } else {
                        CallConnect.close();
                    }
                    break;
                case defaultType.kickout:
                case defaultType.logout:
                    if (token.code === 0) {

                        CallConnect.close();
                        GLOBAL.logout = true;
                    }
                    break;
                case defaultType.changeBindTel:
                    Agent.setBindTel(token.bindTel);
                    Agent.setBindType(token.bindType);
                    break;
                case defaultType.ping:
                    GLOBAL.pingValue = true;
                    //每次都清空
                    if (GLOBAL.pingTimer !== '' && GLOBAL.pingTimer !== 'undefined') {
                        clearTimeout(GLOBAL.pingTimer);
                        GLOBAL.pingTimer = '';
                    }
                    GLOBAL.pingTimer = setTimeout(function () {
                        CallConnect.ping();
                    }, 30000);
                    GLOBAL.latency = (new Date().getTime() - GLOBAL.lastPingTime);
                    token.latency = GLOBAL.latency;
                    break;
            }
        };

        var responseCallbacks = {};

        Response.registerCallback = function (type, callback) {

            if (Util.isUndefined(callback)) {
                return;
            }

            if (!Util.isFunction(callback)) {
                throw TypeError("callback must be a function!");
            }
            responseCallbacks[type] = callback;
        };

        Response.removeCallBack = function (type) {
            if (responseCallbacks && responseCallbacks[type]) {
                delete responseCallbacks[type];
            } else {
                logger.warn("Response.removeCallBack failed: there is not response: [" + type + "]");
            }
        };

        Response.invoke = function (type, token) {
            if (Util.isFunction(responseCallbacks[type])) {
                responseCallbacks[type](token);
            } else {
                if (!defaultType[type]) {
                    logger.debug("Response.invoke failed: there is not response: [" + type + "]");
                }
            }
        };

        return Response;
    })();
    /**
     * 通话链接对象，处理链接关闭、心跳检测、断线重连操作
     */
    var CallConnect = (function () {

        function CallConnect() {

        }

        CallConnect.close = function () {

            logger.debug("Connect.close: 断开连接");

            if (GLOBAL.pingTimer !== '' && GLOBAL.pingTimer !== 'undefined') {
                clearTimeout(GLOBAL.pingTimer);
                GLOBAL.pingTimer = '';
            }
            //软电话
            if (Agent.getBindType() === 3) {
                SipPhone.sipUnRegister();
            }

            if (WebSocketClient !== null) {
                WebSocketClient.disconnect();
            }
        };

        CallConnect.ping = function (options) {
            var lEcho = true;
            if (options) {
                if (options.echo) {
                    lEcho = true;
                }
            }
            GLOBAL.lastPingTime = new Date().getTime();
            WebSocketClient.sendToken({
                type: "ping",
                echo: lEcho
            }, options);
        };

        CallConnect.autoReconnect = function () {

            if (GLOBAL.connectionCloseCount >= 11) {
                logger.debug("Connect.autoReconnect: 连接失败,请稍后再试或联系管理员");
            } else {
                logger.debug("Connect.autoReconnect: 系统正在第" + GLOBAL.connectionCloseCount + "次尝试连接...");

                var autoReconnectsitId = setInterval(function () {

                    GLOBAL.randoms = GLOBAL.randoms - 1;

                    if (GLOBAL.randoms === 0) {

                        GLOBAL.connected = false;

                        var params = {};
                        params.enterpriseId = Agent.getEnterpriseId();
                        params.cno = Agent.getCno();
                        params.loginStatus = Agent.getLoginStatus();
                        params.pauseDescription = Agent.getPauseDescription();
                        params.bindTel = Agent.getBindTel();
                        params.bindType = Agent.getBindType();
                        params.qids = Agent.getQids();
                        params.webSocketUrl = Agent.getWebSocketUrl();
                        params.token = Agent.getToken();

                        ClinkClient.online(params);

                        clearInterval(autoReconnectsitId);
                    } else {

                        var objMsg = {};
                        objMsg.type = "event";
                        objMsg.event = "breakLine";
                        objMsg.enterpriseId = Agent.getEnterpriseId();
                        objMsg.cno = Agent.getCno();
                        objMsg.msg = 'close';
                        objMsg.attempts = GLOBAL.connectionCloseCount;
                        objMsg.randoms = GLOBAL.randoms;
                        objMsg.code = -1;

                        Event.invoke(EVENT_TYPE.BREAK_LINE, objMsg);
                    }

                    if (GLOBAL.connectionCloseCount === 10) {
                        logger.debug("Connect.autoReconnect: 自动重连尝试已经达到最大次数（10次）,请手动重连或联系管理员");
                        clearInterval(autoReconnectsitId);
                    }
                }, 1000);
            }
        };

        return CallConnect;
    })();

    /**
     * 工具条初始加载方法，当js文件以及wav文件加载完成后会调用callback方法通知
     * @param params
     * @param callback
     */
    ClinkClient.setup = function (params, callback) {

        if (params.debug) {
            GLOBAL.debug = true;
        }

        logger.debug("ClinkAgent.setup: " + JSON.stringify(params));

        if (params.sipPhone && !Util.isIE()) {
            logger.debug("ClinkAgent.setup: load sip js&audio");
            if (GLOBAL.ready) {
                GLOBAL.callback = callback;
                Util.loadScript(sipScript, 0);
            } else {
                Util.loadScript(sipScript, 0, callback);
            }
            Util.loadAudio(sipAudio, 0);
        } else {
            if (GLOBAL.ready) {
                callback();
            } else {
                GLOBAL.callback = callback;
            }
        }

        if (params.connectInterval && Util.isNumber(params.connectInterval) && params.connectInterval > 500) {
            GLOBAL.connectInterval = params.connectInterval;
        }
    };
    // 登录
    ClinkClient.login = function (params) {

        logger.debug("ClinkAgent.login: 登录," + JSON.stringify(params));

        if (!params.identifier) {
            params.identifier = GLOBAL.identifier;
        }

        Util.ajax({
            type: 'GET',
            url: GLOBAL.webSocketUrl + "/login",
            dataType: 'jsonp',
            data: {
                identifier: params.identifier,
                cno: params.cno,
                password: params.password
            },
            jsonp: 'callback',
            success: function (result) {

                if (result.code === 0) {

                    params.qids = result.data.qids;
                    params.webSocketUrl = result.data.webSocketUrl;
                    params.enterpriseId = result.data.enterpriseId;
                    params.token = result.data.token;

                    if (document.location.protocol === "https:") {
                        params.webSocketUrl = params.webSocketUrl.replace("http:", "https:")
                    }

                    if (params !== undefined && params.bindType !== undefined) {
                        if (typeof params.bindType === "string") {
                            params.bindType = Number(params.bindType);
                        }
                    }

                    if (params !== undefined && params.type !== undefined) {
                        if (typeof params.type === "string") {
                            params.type = Number(params.type);
                        }
                    }

                    ClinkClient.online(params);
                } else {
                    logger.error(JSON.stringify(result));
                    Response.invoke(RESPONSE_TYPE.LOGIN, result);
                }
            }
        });
    };
    // 座席上线
    ClinkClient.online = function (params) {

        Agent = Agent.init(params);

        if (!params.loginType) {
            params.loginType = 1;
        }

        if (GLOBAL.connected) {// 改成false 保证多个连接
            //如果座席类型为1：全渠道、2：呼叫中心、
            WebSocketClient.sendToken({
                type: "login",
                enterpriseId: Agent.getEnterpriseId(),
                cno: Agent.getCno(),
                loginStatus: Agent.getLoginStatus(),
                bindTel: Agent.getBindTel(),
                bindType: Agent.getBindType(),
                pauseDescription: Agent.getPauseDescription(),
                webSocketUrl: GLOBAL.webSocketUrl,
                loginType: params.loginType,
                chatLoginStatus: Agent.getChatLoginStatus(),
                chatPauseDescription: Agent.getChatPauseDescription()
            });
        } else {
            WebSocketClient.connect();
        }
    };
    //退出
    ClinkClient.logout = function (params) {

        logger.debug("ClinkAgent.logout: 登出," + JSON.stringify(params));


        if (GLOBAL.connected && !GLOBAL.logout) {
            if (Agent.getBindType() === 3) {
                SipPhone.sipUnRegister();
            }
        }

        if (!params) {
            params = {};
        }

        if (params.removeBinding !== 0 && params.removeBinding !== 1) {
            params.removeBinding = 0;
        }

        if (params.logoutMode === 0) {
            params.removeBinding = 0;
        }

        if (!params.logoutType) {
            params.logoutType = 1;
        }

        if (params.removeBinding === 1 || params.logoutMode === 1) {
            WebSocketClient.sendToken({
                type: "logout",
                enterpriseId: Agent.getEnterpriseId(),
                cno: Agent.getCno(),
                removeBinding: params.removeBinding,
                logoutType: params.logoutType
            });
        } else {
            CallConnect.close();
        }
    };
    //获取座席和队列
    ClinkClient.queueStatus = function (params) {

        logger.debug("ClinkAgent.queueStatus: 队列状态," + JSON.stringify(params));

        if (params.qnos === undefined) {
            params.qnos = '';
        }
        if (params.fields === undefined) {
            params.fields = '';
        }
        WebSocketClient.sendToken({
            type: "queueStatus",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            qnos: params.qnos,
            fields: params.fields
        });
    };
    //置忙
    ClinkClient.pause = function (params) {

        logger.debug("ClinkAgent.pause: 置忙," + JSON.stringify(params));

        if (isNaN(params.pauseType)) {
            params.pauseType = 1;
        }
        if (params.pauseDescription === undefined || params.pauseDescription === '') {
            params.pauseDescription = '置忙';
        }
        WebSocketClient.sendToken({
            type: "pause",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            pauseType: params.pauseType,
            pauseDescription: params.pauseDescription
        });
    };
    //置闲
    ClinkClient.unpause = function (params) {

        logger.debug("ClinkAgent.unpause: 置闲" + JSON.stringify(params));

        WebSocketClient.sendToken({
            type: "unpause",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    //获取座席状态
    ClinkClient.status = function (params) {

        logger.debug("ClinkAgent.status: 座席状态," + JSON.stringify(params));

        WebSocketClient.sendToken({
            type: "status",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            monitoredCno: params.monitoredCno
        });
    };
    //外呼
    ClinkClient.previewOutcall = function (params) {

        logger.debug("ClinkAgent.previewOutcall: 预览外呼," + JSON.stringify(params));

        if (params.tel === undefined || params.tel.length === 0) {
            logger.debug("ClinkAgent.previewOutcall: 预览外呼, Error invalid tel");
            return;
        }
        //除去空格等特殊字符和中横线
        params.tel = params.tel.replace(/\s+/g, "");
        params.tel = params.tel.replace(/-/g, "");

        if (isNaN(params.timeout) || params.timeout > 60
            || params.timeout < 5) {
            params.timeout = 30;
        }
        if (isNaN(params.dialTelTimeout) || params.dialTelTimeout > 60
            || params.dialTelTimeout < 5) {
            params.dialTelTimeout = 45;
        }
        if (params.obClid === undefined) {
            params.obClid = '';
        }
        if (params.obClidGroup === undefined) {
            params.obClidGroup = '';
        }
        if (params.requestUniqueId === undefined) {
            params.requestUniqueId = '';
        }
        if (params.userField === undefined) {
            params.userField = {};
        }
        if (params.backupTels === undefined) {
            params.backupTels = '';
        }
        if (params.callType === undefined) {
            params.callType = 4;
        }
        WebSocketClient.sendToken({
            type: "previewOutcall",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            previewOutcallTel: params.tel,
            timeout: params.timeout,
            dialTelTimeout: params.dialTelTimeout,
            obClidLeftNumber: params.obClid,
            obClidGroup: params.obClidGroup,
            userField: params.userField,
            requestUniqueId: params.requestUniqueId,
            backupTels: params.backupTels,
            callType: params.callType
        });
    };
    // 主叫外呼
    ClinkClient.directCallStart = function (params) {

        logger.debug("ClinkAgent.directCallStart: 主叫外呼," + JSON.stringify(params));

        if (isNaN(params.tel)) {
            logger.debug("ClinkAgent.directCallStart: 主叫外呼, Error invalid tel");
            return;
        }
        WebSocketClient.sendToken({
            type: "directCallStart",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            customerNumber: params.tel
        });
    };
    //更改绑定电话
    ClinkClient.changeBindTel = function (params) {

        logger.debug("ClinkAgent.changeBindTel: 修改绑定电话," + JSON.stringify(params));

        if (isNaN(params.bindTel)) {
            logger.debug("ClinkAgent.changeBindTel: 修改绑定电话, Error invalid bindTel");
            return;
        }
        if (isNaN(params.bindType)) {
            logger.debug("ClinkAgent.changeBindTel: 修改绑定电话, Error invalid bindType");
            return;
        }
        WebSocketClient.sendToken({
            type: "changeBindTel",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            bindTel: params.bindTel,
            bindType: params.bindType
        });
    };

    ClinkClient.setCdrTag = function (params) {

        logger.debug("ClinkAgent.setCdrTag: 设置tag," + JSON.stringify(params));

        WebSocketClient.sendToken({
            type: "setCdrTag",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            uniqueId: params.uniqueId,
            callType: params.callType,
            key: params.key,
            value: params.value
        });
    };

    ClinkClient.getCdrTag = function (params) {

        logger.debug("ClinkAgent.getCdrTag: 获取tag," + JSON.stringify(params));

        if (params.key === undefined) {
            params.key = '';
        }
        WebSocketClient.sendToken({
            type: "getCdrTag",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            uniqueId: params.uniqueId,
            key: params.key
        });
    };

    //延长整理时间
    ClinkClient.prolongWrapup = function (params) {

        logger.debug("ClinkAgent.prolongWrapup: 延长整理时间," + JSON.stringify(params));

        if (isNaN(params.wrapupTime)) {
            logger.debug("ClinkAgent.prolongWrapup: 延长整理时间, Error invalid wrapupTime");
            return;
        }
        if (params.wrapupTime < 30 || params.wrapupTime > 600) {
            logger.debug("ClinkAgent.prolongWrapup: 延长整理时间, Error invalid wrapupTime");
            return;
        }
        WebSocketClient.sendToken({
            type: "prolongWrapup",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            wrapupTime: params.wrapupTime
        });
    };
    //挂断
    ClinkClient.unlink = function (params) {
        logger.debug("ClinkAgent.unlink: 挂断," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.unlink: 挂断失败, session已经销毁");
            return;
        }
        var side = '';
        if (params !== undefined && params.side !== undefined) {
            side = params.side;
        }
        WebSocketClient.sendToken({
            type: "unlink",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            side: side
        });
    };
    //外呼取消
    ClinkClient.previewOutcallCancel = function (params) {
        logger.debug("ClinkAgent.previewOutcallCancel: 外呼取消," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.previewOutcallCancel: 外呼取消失败, ClinkAgent已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "previewOutcallCancel",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    //保持
    ClinkClient.hold = function (params) {
        logger.debug("ClinkAgent.hold: 保持," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.hold: 保持失败, session已经销毁");
            return;
        }

        var holdType = 0;
        if (params !== undefined && params.holdType !== undefined) {
            holdType = params.holdType;
        }

        WebSocketClient.sendToken({
            type: "hold",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            holdType: holdType
        });
    };
    //保持取消
    ClinkClient.unhold = function (params) {
        logger.debug("ClinkAgent.unhold: 保持接回," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.unhold: 保持接回失败, session已经销毁");
            return;
        }

        var holdType = 0;
        if (params !== undefined && params.holdType !== undefined) {
            holdType = params.holdType;
        }

        WebSocketClient.sendToken({
            type: "unhold",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            holdType: holdType
        });
    };
    //咨询
    ClinkClient.consult = function (params) {
        logger.debug("ClinkAgent.consult: 咨询," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.consult: 咨询失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "consult",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            consultObject: params.consultObject,
            objectType: params.objectType
        });
    };
    //咨询取消
    ClinkClient.consultCancel = function (params) {
        logger.debug("ClinkAgent.consultCancel: 咨询取消," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.consultCancel: 咨询取消失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "consultCancel",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    //咨询转接
    ClinkClient.consultTransfer = function (params) {
        logger.debug("ClinkAgent.consultTransfer: 咨询转移," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.consultTransfer: 咨询转移失败, session已经销毁");
            return;
        }
        if (params === undefined) {
            params = {};
        }
        if (params.limitTimeSecond === undefined) {
            params.limitTimeSecond = "";
        }
        if (params.limitTimeAlertSecond === undefined) {
            params.limitTimeAlertSecond = "";
        }
        if (params.limitTimeFile === undefined) {
            params.limitTimeFile = "";
        }

        WebSocketClient.sendToken({
            type: "consultTransfer",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            limitTimeSecond: params.limitTimeSecond,
            limitTimeAlertSecond: params.limitTimeAlertSecond,
            limitTimeFile: params.limitTimeFile
        });
    };
    //咨询三方
    ClinkClient.consultThreeway = function (params) {
        logger.debug("ClinkAgent.consultThreeway: 咨询三方," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.consultThreeway: 咨询三方失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "consultThreeway",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    //咨询接回
    ClinkClient.unconsult = function (params) {
        logger.debug("ClinkAgent.unconsult: 咨询接回," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.unconsult: 咨询接回失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "unconsult",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    //转移
    ClinkClient.transfer = function (params) {
        logger.debug("ClinkAgent.transfer: 转移," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.transfer: 转移失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "transfer",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            transferObject: params.transferObject,
            objectType: params.objectType,
            transferVariables: params.transferVariables
        });
    };
    //交互
    ClinkClient.interact = function (params) {
        logger.debug("ClinkAgent.interact: 交互," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.interact: 交互失败, session已经销毁");
            return;
        }
        if (params === undefined) {
            params = {};
        }

        WebSocketClient.sendToken({
            type: "interact",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            ivrId: params.ivrId,
            ivrNode: params.ivrNode,
            interactVariables: params.interactVariables
        });
    };
    //满意度调查
    ClinkClient.investigation = function (params) {
        logger.debug("ClinkAgent.investigation: 满意度调查," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.investigation: 满意度调查失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "investigation",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    //拒接
    ClinkClient.refuse = function (params) {
        logger.debug("ClinkAgent.refuse: 拒接," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.refuse: 拒接失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "refuse",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno()
        });
    };
    // 静音
    ClinkClient.mute = function (params) {
        logger.debug("ClinkAgent.mute: 静音," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.mute: 静音失败, session已经销毁");
            return;
        }

        if (params === undefined) {
            params = {};
        }

        WebSocketClient.sendToken({
            type: "mute",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            direction: params.direction
        });
    };

    // 静音
    ClinkClient.unmute = function (params) {
        logger.debug("ClinkAgent.unmute: 取消静音," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.unmute: 取消静音失败, session已经销毁");
            return;
        }

        if (params === undefined) {
            params = {};
        }

        WebSocketClient.sendToken({
            type: "unmute",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            direction: params.direction
        });
    };


    ClinkClient.setUserData = function (params) {
        logger.debug("ClinkAgent.setUserData: 设置随路数据," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.setUserData: 设置随路数据失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "setUserData",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            userData: params.userData,
            direction: params.direction
        });
    };

    ClinkClient.getUserData = function (params) {
        logger.debug("ClinkAgent.getUserData: 获取随路数据," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.getUserData: 获取随路数据失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "getUserData",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            keys: params.keys,
            encryptKeys: params.encryptKeys,
            encryption: params.encryption,
            direction: params.direction
        });
    };
    //发送按键
    // "digits":"5664",
    // "direction":"out",
    // "duration":100,
    // "gap":250
    ClinkClient.dtmf = function (params) {
        logger.debug("ClinkAgent.dtmf: 发送dtmf," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.dtmf: 发送dtmf失败, session已经销毁");
            return;
        }
        if (params.digits === undefined || isNaN(params.digits)) {
            logger.debug("ClinkAgent.dtmf: 发送dtmf失败, 参数digits格式不正确");
            return;
        }
        if (params.direction !== 1 && params.direction !== 2) {
            logger.debug("ClinkAgent.dtmf: 发送dtmf失败, 参数direction格式不正确");
            return;
        }
        if (params.duration === undefined || isNaN(params.duration)) {
            params.duration = 100;
        }
        if (params.duration < 100 || params.duration > 500) {
            logger.debug("ClinkAgent.dtmf: 发送dtmf失败, 参数duration取值不正确");
            return;
        }
        if (params.gap === undefined || isNaN(params.gap)) {
            params.gap = 250;
        }
        if (params.gap < 250 || params.gap > 1000) {
            logger.debug("ClinkAgent.dtmf: 发送dtmf失败, 参数gap取值不正确");
            return;
        }

        WebSocketClient.sendToken({
            type: "dtmf",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            digits: params.digits,
            direction: params.direction,
            duration: params.duration,
            gap: params.gap
        });
    };
    //录音回放
    ClinkClient.controlPlayback = function (params) {
        logger.debug("ClinkAgent.controlPlayback: 录音回放," + JSON.stringify(params));
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.controlPlayback: 录音回放失败, session已经销毁");
            return;
        }

        WebSocketClient.sendToken({
            type: "controlPlayback",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            action: params.action,
            playUrl: params.playUrl,
            skipMs: params.skipMs
        });
    };

    // 发送验证码
    ClinkClient.sendVerificationCode = function (params) {

        if (params === undefined || params.bindTel === undefined) {
            logger.debug("ClinkAgent.sendVerificationCode: 发送验证码失败，绑定电话不能为空");
            return;
        }

        WebSocketClient.sendToken({
            type: "sendVerificationCode",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            bindTel: params.bindTel
        })
    };

    // 软电话外呼
    ClinkClient.sipCall = function (params) {
        logger.debug("ClinkAgent.sipCall: 软电话外呼," + JSON.stringify(params));
        SipPhone.sipCall(params.tel);
    };
    // 软电话接听
    ClinkClient.sipLink = function () {
        logger.debug("ClinkAgent.sipLink: sip接听");
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.sipLink: sip接听失败, session已经销毁");
            return;
        }
        SipPhone.sipAnswer();
    };
    // 软电话挂断
    ClinkClient.sipUnlink = function () {
        logger.debug("ClinkAgent.sipUnlink: sip挂断");
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.sipUnlink: sip挂断失败, session已经销毁");
            return;
        }
        SipPhone.sipHangup();
    };
    // 软电话发送按键
    ClinkClient.sipDTMF = function (params) {
        logger.debug("ClinkAgent.sipDTMF: sipDTMF");
        if (!CallSession.isSessionAlive()) {
            logger.debug("ClinkAgent.sipDTMF: sipDTMF失败, session已经销毁");
            return;
        }
        SipPhone.sendDTMF(params);
    };

    // 注册事件监听函数
    ClinkClient.registerListener = function (type, listener) {
        if (Util.isFunction(listener)) {
            Event.registerListener(type, listener);
        } else {
            logger.error("ClinkAgent.registerListener: 2rd parameter callback must be function!");
        }
    };

    // 注册回调函数
    ClinkClient.registerCallback = function (type, callback) {
        if (Util.isFunction(callback)) {
            Response.registerCallback(type, callback);
        } else {
            logger.error("ClinkAgent.registerCallback: 2rd parameter callback must be function!");
        }
    };
    // 李志颖start
    //发送消息事件
    ClinkClient.chatSendMessage = function (params) {
        WebSocketClient.chatSendToken({
            type: "message",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            mainUniqueId: params.mainUniqueId,
            content: params.content,
            messageId: params.messageId
        });
    };

    //会话转移发送消息事件
    ClinkClient.chatTransfer = function (params) {
        WebSocketClient.chatSendToken({
            type: "transfer",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            targetType: params.targetType,
            targetNo: params.targetNo,
            mainUniqueId: params.mainUniqueId,
            content: params.content
        });
    };

    //会话三方
    ClinkClient.chatThreeway = function (params) {
        WebSocketClient.chatSendToken({
            type: "threeway",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            mainUniqueId: params.mainUniqueId,
            targetCno: params.targetCno
        });
    };

    //关闭会话
    ClinkClient.chatClose = function (params) {
        WebSocketClient.chatSendToken({
            type: "close",
            enterpriseId: Agent.getEnterpriseId(),
            cno: Agent.getCno(),
            mainUniqueId: params.mainUniqueId
        });
    };
    // 李志颖end
    // 开放给用户的事件常量对象
    ClinkClient.EventType = EVENT_TYPE;
    ClinkClient.ResponseType = RESPONSE_TYPE;

    // 给所有回调注册默认方法
    var defaultCallback = function (token) {
        logger.debug(JSON.stringify(token));
    };
    // 李志颖start
    Response.registerCallback(RESPONSE_TYPE.CHAT_MESSAGE, defaultCallback);
    // 李志颖end
    Response.registerCallback(RESPONSE_TYPE.LOGIN, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.LOGOUT, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.QUEUE_STATUS, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.PAUSE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.UNPAUSE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.STATUS, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.PREVIEW_OUTCALL, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.DIRECT_CALL_START, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CHANGE_BIND_TEL, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SET_CDR_TAG, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.PROLONG_WRAPUP, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.UNLINK, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.PREVIEW_OUTCALL_CANCEL, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.HOLD, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.UNHOLD, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CONSULT, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CONSULT_CANCEL, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CONSULT_TRANSFER, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.UNCONSULT, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.TRANSFER, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.INTERACT, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.INVESTIGATION, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.REFUSE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.MUTE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.UNMUTE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SET_USER_DATA, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.GET_USER_DATA, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.DTMF, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CONTROL_PLAYBACK, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SEND_VERIFICATION_CODE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SIP_CALL, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SIP_LINK, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SIP_UNLINK, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.SIP_DTMF, defaultCallback);
    // 李志颖start
    Response.registerCallback(RESPONSE_TYPE.PING, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CHAT_MESSAGE, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CHAT_TRANSFER, defaultCallback);
    Response.registerCallback(RESPONSE_TYPE.CHAT_CLOSE, defaultCallback);
    // 李志颖end

    return ClinkClient;

})("aliyun", "https://ws-bj-test1.clink.cn");
