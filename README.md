<!-- markdownlint-disable MD010 -->

> 参考: [Promise - Javascript MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise)、[Promise 原理分析](https://segmentfault.com/a/1190000006921539)

多重的异步操作会造成回调地狱

```js
doSomething(function(result) {
  doSomethingElse(result, function(newResult) {
    doThirdThing(newResult, function(finalResult) {
      console.log('Got the final result: ' + finalResult);
    }, failureCallback);
  }, failureCallback);
}, failureCallback);
```

<!-- more -->

Promise 对象用于异步操作，一个 Promise 对象代表未完成但是预期将会完成的操作。它**允许你为异步操作的成功或失败分别绑定相应的处理方法**。这让异步方法可以像同步方法那样返回值，但并**不是立即返回最终执行结果**

一个 Promise 有如下几种状态：

- **pending:** 初始状态，既不是成功，也不是失败状态
- **fulfilled:** 意味着操作成功完成
- **rejected:** 意味着操作失败

![](http://ony85apla.bkt.clouddn.com/18-2-27/39372748.jpg)

pending 状态的 Promise 对象可能触发 fulfilled 状态并传递一个值给相应的状态处理方法，也可能触发 rejected 状态并出传递失败信息。但其中任意一种情况出现， Promise 对象的 then 方法绑定的处理方法就会被调用（then 方法包含两个参数：onFulfilled, onRejected，它们都是 Function 类型。当 Promise 状态为 fulfilled 时，调用 then 方法的 onFulfilled 方法，当 Promise 状态为 rejected 时，调用 then 方法的 onRejected 方法）(当一个 Promise 对象处于 fulfilled 或 rejected 状态而不是 pending 状态，它也可以被称为 settled 状态)

因为 Promise.prototype.then 和 Promise.prototype.catch 方法返回 Promise 对象，所以可以被链式调用

## Promise 构造函数

```js
new Promise(executor)

new Promise(function(resolve, reject) {
	// 一般做一些异步操作，最终会调用下面两者之一

	resolve(someValue) // fulfilled

	// 或
	reject('failure reason') // rejected
})
```

#### 参数

**executor**

executor 是带有 resolve 和 reject 两个参数的函数。 **Promise 构造函数执行时立即调用 executor 函数**，resolve 和 reject 两个函数作为参数传递给 executor（executor 函数在 Promise 构造函数返回新建对象前被调用）。resolve 和 reject 函数被调用时，分别将 Promise 状态改为 fulfilled（完成）和 rejected（失败）。executor 内部通常会执行一些异步操作，一旦完成，可以调用 **resolve 函数将 promise 状态改为 fulfilled，或者在发生错误时将它的状态改为 rejected**

如果在 executor 函数中抛出一个错误，则将该 Promise 状态改为 rejected，executor 函数的返回值被忽略

#### 实现

构造函数只要完成状态的初始化，立即执行传入的 executor，并提供 resolve 和 reject 连个方法用于转变状态;
resolve 函数将 promise 状态设置为 fulfilled，同时如果有成功回调函数就执行，reject 函数将 promise 状态设置为 rejected，同时如果有失败回调函数就执行

```js
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

// Promise 构造函数
let Promise = function(fn) {
	// fn 带有 resolve 和 reject 两个参数的函数对象，第一个参数用于处理执行成功的场景，第二个参数用在处理执行失败的场景，一旦操作完成即可调用这些函数
	const self = this
	self.state = PENDING // 初始化状态
	self.value = null // 存储异步结果的对象状态变量
	self.fulfilledCallback = null // 存储成功回调函数
	self.rejectedCallback = null // 存储失败回调函数

	// resolve 方法接受一个成功值，传递给绑定的 FULFILLED 回调函数。主要工作是将当前状态变为 fulfilled 状态，同时调用绑定的 fulfilled 回调函数
	function resolve(value) {
		// fulfilled 回调函数是通过 Promise.prototype.then 注册的
		const fulfilledCallback = self.fulfilledCallback

		if (self.state === PENDING) {
			self.state = FULFILLED // 状态转换
			self.value = value // 保存成功值

			if (isFunction(fulfilledCallback)) {
				setTimeout(function() {
					// 不阻塞主流程，在下一个事件轮询中再调用 fulfilled 回调函数
					fulfilledCallback(value)
				})
			}
		}
	}

	// reject 方法接受一个失败信息，传递给绑定的 rejected 回调函数。主要工作是将当前状态变为 rejected 状态，同时调用绑定的 rejected 回调函数
	function reject(reason) {
		// rejected 回调函数是通过 Promise.prototype.catch 注册的
		const rejectedCallback = self.rejectedCallback

		if (self.state === PENDING) {
			self.state = REJECTED // 状态转换
			self.value = reason // 保存成功值

			if (isFunction(rejectedCallback)) {
				setTimeout(function() {
					// 不阻塞主流程，在下一个事件轮询中再调用 rejected 回调函数
					rejectedCallback(reason)
				})
			}
		}
	}

	// 立即执行传入的函数，如果出现异常调用 reject 方法，将状态变为 rejected，同时调用回调函数
	try{
		fn && fn(resolve, reject)
	} catch(err) {
		reject(err)
	}
}
```

## then

```js
let p = new Promise(...)

p.then(onFulfilled, onRejected)

p.then(function(value) {
	// success
}, function(reason) {
	// failure
})

// 或者 失败回调用 catch 处理
p.then(function(value) {
	// success
}).catch(function(reason) {
	// failure
})
```

then 方法返回一个 Promise，它有两个参数，分别为 Promise 在成功和失败情况下的为调函数。onFulfilled 回调函数在 Promise 状态为 fulfilled 时调用，该函数有一个参数，为成功的返回值；onRejected 回调函数在 Promise 状态为 rejected 时调用，该函数只有一个参数，为失败的原因

#### 实现

then 方法根据当前状态，**当状态为 pending 时，注册回调函数到当前 Promise 对象中，当状态为 fulfilled 或 rejected 时，立即执行回调函数**。同时注意不管哪种情况都要**返回一个新 Promise 对象**方便链式调用

```js
// then 方法返回一个 Promise，它有两个参数，分别为 Promise 在成功和失败情况下的回调函数
// onFulfilled 回调函数，当 Promise 状态为 fulfilled 时候调用，该函数有一个参数，为成功的返回值
// onRejected 回调函数，当 Promise 状态为 rejected 时候调用，该函数有一个参数，为失败的原因

Promise.prototype.then = function(onFulfilled, onRejected) {
	const self = this
	const value = self.value
	// 如果 onFulfilled 不是函数，回调函数仅仅返回成功值
	const fulfilledCallback = isFunction(onFulfilled) ? onFulfilled : function returnFunc(value) { return value }
	// 如果 onFulfilled 不是函数，回调函数仅仅返回成功值
	const rejectedCallback = isFunction(onRejected) ? onRejected : function throwFunc(reason) { throw reason }

	// 当前状态为 PENDING，注册回调函数到当前 Promise 对象中
	if (self.state === PENDING) {
		// 返回一个新的 Promise 对象，可以被链式调用
		return new Promise(function(resolve, reject) {
			// 将 fulfilled 回调函数注册到当前 Promise 对象中（非新 Promise 对象）
			self.fulfilledCallback = function(value) {
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
			self.rejectedCallback = function(reason) {
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
	if (self.state === FULFILLED) {
		// 返回一个新的 Promise 对象，可以被链式调用
		return new Promise(function(resolve, reject) {
			// 在下一个事件轮询中立即调用 fulfilled 回调函数，根据执行情况决定新 Promise 对象的状态转变
			setTimeout(function() {
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
	if (self.state === REJECTED) {
		// 返回一个新的 Promise 对象，可以被链式调用
		return new Promise(function(resolve, reject) {
			// 在下一个事件轮询中立即调用 rejected 回调函数，根据执行情况决定新 Promise 对象的状态转变
			setTimeout(function() {
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
	function resolveValue(value, resolve, reject) {
		// 如果传递值为 Promise 对象，将新 Promise 对象的 resolve 和 reject 方法传递给 Promise 传递值以触发状态的转换
		if (value instanceof Promise) {
			value.then(resolve, reject)
			return
		}

		// 如果传递值不是 Promise 对象，传递给 resolve 方法
		resolve(value)
	}
}
```

## catch

```js
let p = new Promise(...)

p.catch(function(reason) {
	// failure
})
```

catch 方法只处理 Promise 被拒绝的情况，并返回一个 Promise。

#### 实现

catch 方法是对 then 方法的封装，仅仅传递 onRejected 失败回调函数

```js
// catch 方法只处理 Promise 的情况并返回一个 Promise
// 其实是对 then 方法的封装，仅传递 onRejected 失败回调函数

Promise.prototype.catch = function(onRejected) {
	return this.then(null, onRejected)
}
```

## reject

```js
Promise.reject(new Error('something wrong')).then(null, function(reason) {
	// failure
})

Promise.reject(new Error('something wrong')).catch(function(reason) {
	// failure
})
```

#### 实现

返回一个新 Promise 对象，通过其构造函数的参数 reject 函数将状态变为 rejected

```js
// Promise.reject(reason) 方法返回一个被拒绝的 Promise 对象
Promise.reject = function(reason) {
	return new Promise(function(resolve, reject) {
		reject(reason)
	})
}
```

## resolve

```js
Promise.resolve(10).then(function(value) {
	// success
})
```

#### 实现

Promise.resolve(value) 方法返回一个以给定值解析的 Promise 对象。如果这个值是一个 Promise 对象，返回的 Promise 会采用它的最终状态，否则会以该值为成功状态返回 Promise 对象

```js
// Promise.resolve(value) 方法返回一个以给定值解析的 Promise 对象。如果这个值是一个 Promise 对象，返回的 Promise 会采用它的最终状态，否则会以该值为成功状态返回 Promise 对象
Promise.resolve = function(value) {
	// 如果为 Promise 对象，直接返回当前值
	if (value instanceof Promise) {
		return value
	}

	return new Promise(function(resolve) {
		resolve(value)
	})
}
```

## race

```js
Promise.race([p1, p2]).then(function(value) {
	// success
}, function(reason) {
	// failure
})
```

#### 实现

Promise.race(values) 返回一个 Promise 对象，这个 Promise 在 values 中的**任意一个 Promise 被解决或拒绝后，立刻以相同的解决值被解决或以相同的拒绝原因被拒绝**

```js
// Promise.race(values) 返回一个 Promise 对象，这个 Promise 在 values 中的任意一个 Promise 被解决或拒绝后，立刻以相同的解决值被解决或以相同的拒绝原因被拒绝
Promise.race = function(values) {
	// 检验 values 是否是数组
	if (!isArray(values)) {
		return Promise.reject(new Error('Promise.race must be provided an Array'))
	}

	return new Promise(function(resolve, reject) {
		values.forEach(function(value) {
			// 遍历，使用 Promise.resolve 解析 value（可能为 Promise 对象或其他值）
			// 将新 Promise 对象的 resolve reject 传递给解析后的 Promise.prototype.then
			Promise.resolve(value).then(resolve, reject)
		})
	})
}
```

## all

```js
Promise.all([p1, p2]).then(function(values) {
	// success
})
```

#### 实现

Promise.all(values) 返回一个 Promise 对象，该 Promise 会**等 values 参数内所有值都被 resolve 后才被 resolve，或以 values 参数内的第一个被 reject 的原因而被 reject**

```js
// Promise.all(values) 返回一个 Promise 对象，该 Promise 会等 values 参数内所有值都被 resolve 后才被 resolve，或以 values 参数内的第一个被 reject 的原因而被 reject
Promise.all = function(values) {
	// 检验 values 是否是数组
	if (!isArray(values)) {
		return Promise.reject(new Error('Promise.all must be provided an Array'))
	}

	return new Promise(function(resolve, reject) {
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
		function doResolve(index, value) {
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
```
