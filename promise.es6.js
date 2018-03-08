((global, factory) => {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof defind === 'function' && typeof defind.amd !== 'undefined' ? define(factory) : global.Promise = factory()
})(this, () => {
  // 判断是否是函数
  const isFunction = (fn) => Object.prototype.toString.call(fn) === '[object Function]'

  // 判断是否是数组
  const isArray = (arr) => Object.prototype.toString.call(arr) === '[object Array]'

  // 全局定义 使用 Symbol 类型保证独一无二的值
  const PENDING = Symbol('pending')
  const FULFILLED = Symbol('fulfilled')
  const REJECTED = Symbol('rejected')

  // Promise 类
  class Promise {
    // fn 带有 resolve 和 reject 两个参数的函数对象，第一个参数用于处理执行成功的场景，第二个参数用在处理执行失败的场景，一旦操作完成即可调用这些函数
    constructor(fn) {
      this.state = PENDING // 初始化状态
      this.value = null // 存储异步结果的对象状态变量
      this.fulfilledCallback = null // 存储成功回调函数
      this.rejectedCallback = null // 存储失败回调函数

      // resolve 方法接受一个成功值，传递给绑定的 FULFILLED 回调函数。主要工作是将当前状态变为 fulfilled 状态，同时调用绑定的 fulfilled 回调函数
      const resolve = value => {
        // fulfilled 回调函数是通过 Promise.prototype.then 注册的
        const fulfilledCallback = this.fulfilledCallback

        if (this.state === PENDING) {
            this.state = FULFILLED // 状态转换
            this.value = value // 保存成功值

            if (isFunction(fulfilledCallback)) {
              setTimeout(() => {
                // 不阻塞主流程，在下一个事件轮询中再调用 fulfilled 回调函数
                fulfilledCallback(value)
              })
            }
        }
      }

      // reject 方法接受一个失败信息，传递给绑定的 rejected 回调函数。主要工作是将当前状态变为 rejected 状态，同时调用绑定的 rejected 回调函数
      const reject = reason => {
        // rejected 回调函数是通过 Promise.prototype.catch 注册的
        const rejectedCallback = this.rejectedCallback

        if (this.state === PENDING) {
          this.state = REJECTED // 状态转换
          this.value = reason // 保存成功值

          if (isFunction(rejectedCallback)) {
            setTimeout(() => {
              // 不阻塞主流程，在下一个事件轮询中再调用 rejected 回调函数
              rejectedCallback(reason)
            })
          }
        }
      }

      // 执行传入的函数，如果出现异常调用 reject 方法，将状态变为 rejected，同时调用回调函数
      try{
        fn && fn(resolve, reject)
      } catch(err) {
        reject(err)
      }
    }
    
    // then 和 catch 都是公有方法
    // then 方法
    // then 方法返回一个 Promise，它有两个参数，分别为 Promise 在成功和失败情况下的回调函数
    // onFulfilled 回调函数，当 Promise 状态为 fulfilled 时候调用，该函数有一个参数，为成功的返回值
    // onRejected 回调函数，当 Promise 状态为 rejected 时候调用，该函数有一个参数，为失败的原因
    // 将回调返回的结果作为新 Promise 的 resolve 的参数
  
    then(onFulfilled, onRejected) {
      const value = this.value
      // 如果 onFulfilled 不是函数，回调函数仅仅返回成功值
      const fulfilledCallback = isFunction(onFulfilled) ? onFulfilled : value => value 
      // 如果 onFulfilled 不是函数，回调函数仅仅返回成功值
      const rejectedCallback = isFunction(onRejected) ? onRejected : reason => { throw reason }

      // 当前状态为 PENDING，注册回调函数到当前 Promise 对象中
      if (this.state === PENDING) {
        // 返回一个新的 Promise 对象，可以被链式调用
        return new Promise((resolve, reject) => {
          // 将 fulfilled 回调函数注册到当前 Promise 对象中（非新 Promise 对象）
          this.fulfilledCallback = value => {
            // 根据回调函数的执行情况，通过传递新的 Promise 对象的 resolve 和 reject 方法对其状态进行转变
            try {
              const newValue = fulfilledCallback(value)
              // 解析成功值
              resolveValue(newValue, resolve, reject)
            } catch(err) {
              reject(err)
            }
          }

          // 同上
          this.rejectedCallback = reason => {
            try{
              const newReason = rejectedCallback(reason)
              resolveValue(newReason, resolve, reject)
            } catch(err) {
              reject(err)
            }
          }
        })
      }

      // 当前状态为 fulfilled，立即执行回调函数
      if (this.state === FULFILLED) {
        // 返回一个新的 Promise 对象，可以被链式调用
        return new Promise((resolve, reject) => {
          // 在下一个事件轮询中立即调用 fulfilled 回调函数，根据执行情况决定新 Promise 对象的状态转变
          setTimeout(() => {
            try {
              const newValue = fulfilledCallback(value)
              resolveValue(newValue, resolve, reject)
            } catch(err) {
              reject(err)
            }
          })
        })
      }

      // 当前状态为 rejected，立即执行回调函数
      if (this.state === REJECTED) {
        // 返回一个新的 Promise 对象，可以被链式调用
        return new Promise((resolve, reject) => {
          // 在下一个事件轮询中立即调用 rejected 回调函数，根据执行情况决定新 Promise 对象的状态转变
          setTimeout(() => {
            try{
              const newReason = rejectedCallback(reason)
              resolveValue(newReason, resolve, reject)
            } catch(err) {
              reject(err)
            }
          })
        })
      }

      // 解析传递值函数
      const resolveValue = (value, resolve, reject) => {
        // 如果传递值为 Promise 对象，将新 Promise 对象的 resolve 和 reject 方法传递给 Promise 传递值以触发状态的转换
        if (value instanceof Promise) {
          value.then(resolve, reject)
          return
        }

        // 如果传递值不是 Promise 对象，传递给 resolve 方法
        resolve(value)
      }
    }

    // catch 方法
    // catch 方法只处理 Promise 的情况并返回一个 Promise
    // 其实是对 then 方法的封装，仅传递 onRejected 失败回调函数

    catch(onRejected) {
      return this.then(null, onRejected)
    }
    
    // 以下都是静态方法
    // Promise.reject(reason) 方法返回一个被拒绝的 Promise 对象
    static reject(reason) {
      return new Promise((resolve, reject) => {
        reject(reason)
      })
    }

    // Promise.resolve(value) 方法返回一个以给定值解析的 Promise 对象。如果这个值是一个 Promise 对象，返回的 Promise 会采用它的最终状态，否则会以该值为成功状态返回 Promise 对象
    static resolve(value) {
      // 如果为 Promise 对象，直接返回当前值
      if (value instanceof Promise) {
        return value
      }

      return new Promise(resolve => {
        resolve(value)
      }) 
    } 

    // Promise.race(values) 返回一个 Promise 对象，这个 Promise 在 values 中的任意一个 Promise 被解决或拒绝后，立刻以相同的解决值被解决或以相同的拒绝原因被拒绝
    static race(values) {
      // 检验 values 是否是数组
      if (!isArray(values)) {
        return Promise.reject(new Error('Promise.race must be provided an Array'))
      }

      return new Promise((resolve, reject) => {
        values.forEach(value => {
          // 遍历，使用 Promise.resolve 解析 value（可能为 Promise 对象或其他值）
          // 将新 Promise 对象的 resolve reject 传递给解析后的 Promise.prototype.then
          Promise.resolve(value).then(resolve, reject)
        })
      })
    }

    // Promise.all(values) 返回一个 Promise 对象，该 Promise 会等 values 参数内所有值都被 resolve 后才被 resolve，或以 values 参数内的第一个被 reject 的原因而被 reject
    static all(values) {
      // 检验 values 是否是数组
      if (!isArray(values)) {
        return Promise.reject(new Error('Promise.all must be provided an Array'))
      }

      return new Promise((resolve, reject) => {
        // 如果数组长度为 0，直接 resolve 并且结束处理
        if (values.length === 0) {
          resolve([])
          return
        }

        const len = values.length
        // 创建一个数组来保存 values 的 Promise 返回值
        const result = new Array(len)
        let remaining = len

        // 处理 values 数组中的值
        const doResolve = (index, value) => {
          Promise.resolve(value).then(function(val) {
            // 将解析后的 Promise 返回值保存在对应索引的结果集中
            result[index] = value

            // 当 values 所有值都解析完后，调用新 Promise 对象的 resolve 方法
            // 把所有返回值 result 传递被后续传力，将状态转换为 fulfilled
            if (--remaining === 0) {
              resolve(result)
            }
          }, reject)
        }

        // 迭代 values 对象，传递其索引位置保证结果值的顺序
        for (let i = 0; i < len; i++) {
          doResolve(i, values[i])
        }
      })
    }
  }

  return Promise
})