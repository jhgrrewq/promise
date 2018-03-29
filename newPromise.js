
(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof defind === 'function' && typeof defind.amd !== 'undefined' ? define(factory) : global.Promise = factory()
})(this, function() {
    // 判断是否是函数
    function isFunction(fn) {
        return Object.prototype.toString.call(fn) === '[object Function]'
    }

    // 判断是否是数组
    function isArray(arr) {
        return Object.prototype.toString.call(arr) === '[object Array]'
    }

    // 全局定义
    const PENDING = 0
    const FULFILLED = 1
    const REJECTED = 2

    function Promise(fn) {
        const self = this;
        self.status = 'pending';  //设定初始状态
        self.value = undefined;
        self.fulfilledCallbackList = [];  //onFulfilled函数序列
        self.rejectedCallbackList = [];  //onRejected函数序列
      
        function resolve(value) {
            if (value instanceof Promise) {
                return value.then(resolve, reject);
            }
            //异步执行resolve或reject方法，保证代码的统一性和注册的回调函数按照正确的顺序执行
            if (self.status === 'pending') {
                self.status = 'fulfilled';
                self.value = value;
                self.fulfilledCallbackList.forEach(cb => cb(value))
            }
        }
      
        function reject(reason) {
                if (self.status === 'pending') {
                    self.status = 'rejected';
                    self.reason = reason;
                    self.rejectedCallbackList.forEach(cb => cb(reason))
                }
        }
      
        try {
            fn(resolve, reject);
        } catch (err) {
            throw new Error(err);
        }
      }
      
      function resolvePromise(promise2, x, resolve, reject) {
        if (x === promise2) {
            return reject(new TypeError('循环引用'));
        }
        //如果返回的是一个thenable对象，即一个拥有then方法的对象，那么使用它的then方法去获得它的最终返回值。目的是为了兼容其他Promise库
        if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
            let then, called;
            try {
                then = x.then;
                if (typeof then === 'function') {
                    then.call(x, function (newx) {
                        if (called) return;   //防止重复调用
                        called = true;
                        resolvePromise(promise2, newx, resolve, reject);
                    }, function (err) {
                        if (called) return;
                        called = true;
                        return reject(err);
                    });
                } else {
                    resolve(x);
                }
            } catch (err) {
                if (called) return;
                called = true;
                reject(err);
            }
        } else {
            resolve(x);
        }
      }
      
      Promise.prototype.then = function (onFulfilled, onRejected) {
        const self = this;
        let promise2;
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : function (data) {
            return data;
        };
        onRejected = typeof onRejected === 'function' ? onRejected : function (data) {
            throw data;
        };
        //为了支持同步代码，当then方法注册的时候如果Promise的状态已经改变，那么立即执行对应的函数
        if (self.status === 'fulfilled') {
            promise2 = new Promise(function (resolve, reject) {
                setTimeout(function () {
                    let x;
                    try {
                        x = onFulfilled(self.value);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (err) {
                        reject(err);
                    }
                })
            })
        }
        if (self.status === 'rejected') {
            promise2 = new Promise(function (resolve, reject) {
                setTimeout(function () {
                    let x;
                    try {
                        x = onRejected(self.reason);
                        resolvePromise(promise2, x, resolve, reject);
                    } catch (err) {
                        reject(err);
                    }
                })
            })
        }
        if (self.status === 'pending') {
            promise2 = new Promise(function (resolve, reject) {
                self.fulfilledCallbackList.push(function (value) {
                    setTimeout(function () {
                        let x;
                        try {
                            x = onFulfilled(value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (err) {
                            reject(err);
                        }
                    });
                });
                self.rejectedCallbackList.push(function (reason) {
                    setTimeout(function () {
                        try {
                            let x = onRejected(reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (err) {
                            reject(err);
                        }
                    });
                });
            })
        }
        return promise2;  //返回一个新的Promise实例，以便支持链式调用
      };
      
      Promise.prototype.catch = function (onRejected) {
        this.then(null, onRejected);
      };
      
      Promise.all = function (someValue) {
        let resolveValArr = [];
        let count = promiseLen = 0;
        let promise2;
        promise2 = new Promise(function (resolve, reject) {
            let iNow = 0;
            try {
                for (let item of someValue) {
                    if (item !== null && typeof item === "object") {
                        try {
                            let then = item.then;
                            let index = iNow;
                            if (typeof then === 'function') {
                                promiseLen++;
                                then.call(item, function (value) {
                                    resolveValArr[index] = value;
                                    if (++count === promiseLen) {
                                        resolve(resolveValArr)
                                    }
                                }, function (err) {
                                    reject(err);
                                });
                            }
                        } catch (err) {
                            resolveValArr[iNow] = item;
                        }
                    } else {
                        resolveValArr[iNow] = item;
                    }
                    iNow++;
                }
                if (iNow === 0) {
                    return resolve(someValue);
                }
                if (promiseLen === 0) {
                    return resolve(resolveValArr);
                }
            } catch (err) {
                reject(new TypeError('无法遍历的类型!'));
            }
        });
        return promise2;
      };
      
      
      Promise.race = function (someValue) {
        let promise2;
        promise2 = new Promise(function (resolve, reject) {
            let iNow = 0;
            try {
                for (let item of someValue) {
                    if (item !== null && typeof item === "object") {
                        try {
                            let then = item.then;
                            then.call(item, function (value) {
                                resolve(value);
                            }, function (err) {
                                reject(err);
                            });
                        } catch (err) {
                            resolve(item);
                            break;
                        }
                    } else {
                        resolve(item);
                        break;
                    }
                    iNow++;
                }
                if (iNow === 0) {
                    return resolve(someValue);
                }
            } catch (err) {
                reject(new TypeError('无法遍历的类型!'));
            }
        });
        return promise2;
      };
      Promise.resolve = function (value) {
        let promise2;
        if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
            promise2 = new Promise(function (resolve, reject) {
                try {
                    let then = value.then;
                    if (typeof value.then === 'function') {
                        then.call(value, function (data) {
                            resolve(data);
                        }, reject);
                    } else {
                        resolve(value);
                    }
                } catch (err) {
                    reject(err);
                }
            })
        } else {
            promise2 = new Promise(function (resolve) {
                resolve(value);
            })
        }
        return promise2;
      };
      Promise.reject = function (reason) {
        return new Promise(function (resolve, reject) {
            reject(reason);
        })
    }
    return Promise
})
