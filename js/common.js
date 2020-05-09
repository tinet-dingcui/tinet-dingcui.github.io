/*****************cookie tools********************/

/**
 * 默认的cookie写入方法
 * @param name
 * @param value
 */
function setCookie(name,value){
    document.cookie = name + "="+ encodeURI(value);
}
/**
 * 获取Cookie中的值
 * @param objName
 * @returns
 */
function getCookie(objName){//获取指定名称的cookie的值 
    var arrStr = document.cookie.split("; "); 
    for (var i = 0; i < arrStr.length; i++) {
        var temp = arrStr[i].split("="); 
        if (temp[0] == objName){ 
            return decodeURI(temp[1]); 
        }
    } 
}


/**
 * cookie删除
 * @param name
 */
function deleteCookie(name){
    document.cookie = name + "=;  expires=Thu, 01 Jan 1970 00:00:00 GMT";
}