class Stream {

    constructor(arr) {
        if (arr) {
            this.source(arr)
        }
    }

    static of(arr) {
        return new Stream(arr)
    }

    source(arr) {
        this.name = 'source'
        this.originArray = arr
        this.wrap = function (downstream) {
            this.accept = () => {
                if (!this.originArray) {
                    return
                }

                // loop transfer element to stream chain
                for (var e of this.originArray) {
                    downstream.accept(e)
                    // exist short-circuit operate, must check after handle an element
                    if (this.isShortCircuit && this.isShortCircuit()) {
                        return
                    }
                }

                if (this.passBarrier) {
                    // exist barrier, call passBarrier() to pass it
                    this.passBarrier()
                }
            }
        }
        return this
    }

    // ************ all middle operation in following **********************************

    filter(predicate) {
        var downstream = this.#createDownstream('filter')
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                if (predicate(e)) {
                    downstream.accept(e)
                }
            }

        }
        return downstream
    }

    map(mapper) {
        var downstream = this.#createDownstream('map')
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                downstream.accept(mapper(e))
            }
        }
        return downstream
    }

    flatMap(mapper) {
        var downstream = this.#createDownstream('flatMap')
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                var arr = mapper(e);
                if (arr) for (var e of arr) {
                    downstream.accept(e)
                }
            }
        }
        return downstream
    }

    distinct(repeat) {
        var downstream = this.#createDownstream('distinct'), state = []
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                var rp = repeat ? repeat(e) : e
                if (state.indexOf(rp) === -1) {
                    state.push(rp)
                    downstream.accept(e)
                }
            }
        }
        return downstream
    }

    sorted(comparator) {
        var downstream = this.#createDownstream('sorted'), state = [], barrierFlag
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                state.push(e)

                if (!barrierFlag) {
                    // create barrier, wait upstream call passBarrier()
                    barrierFlag = true
                    this.#buildBarrierRequestChain(() => {
                        // ascending order
                        let arr = state, len = arr.length;
                        for (let i = 0; i < len - 1; i++) {
                            for (let j = 0; j < len - 1 - i; j++) {
                                if (comparator ? comparator(arr[j], arr[j + 1]) : arr[j] > arr[j + 1]) {
                                    // swap two elements
                                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                                }
                            }
                        }

                        // after accept all element, transfer elements to downstream
                        for (var e of arr) {
                            downstream.accept(e)
                            // exist short-circuit operate, must check after handle an element
                            if (this.isShortCircuit && this.isShortCircuit()) {
                                return
                            }
                        }

                        // downstream has barrier, call passBarrier()
                        if (downstream.passBarrier) {
                            downstream.passBarrier()
                        }
                    })
                }
            }
        }
        return downstream
    }

    peek(action) {
        var downstream = this.#createDownstream('peek')
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                action(e)
                downstream.accept(e)
            }
        }
        return downstream
    }

    limit(n) {
        var downstream = this.#createDownstream('limit')
        downstream.i = 0
        downstream.limitNum = n
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                this.i++
                if (this.i <= this.limitNum) {
                    downstream.accept(e)
                }
            }
        }
        downstream.#buildShortCircuitRequestChain(() => downstream.i === downstream.limitNum)
        return downstream
    }

    skip(n) {
        var downstream = this.#createDownstream('skip')
        downstream.i = 0
        downstream.skipNum = n
        downstream.wrap = function (downstream) {
            this.accept = (e) => {
                this.i++
                if (this.i > this.skipNum) {
                    downstream.accept(e)
                }
            }
        }
        return downstream
    }

    // ************ all terminal operation in following **********************************

    forEach(action) {
        var downstream = this.#createDownstream('forEach')
        downstream.accept = (e) => {
            action(e)
        }
        downstream.#evaluate()
    }

    toArray() {
        var downstream = this.#createDownstream('toArray'), state = []
        downstream.accept = (e) => {
            state.push(e)
        }
        downstream.#evaluate()
        return state
    }

    toMap(keyMapper, valueMapper, mergeFunction) {
        var downstream = this.#createDownstream('toArray'), state = {}
        downstream.accept = (e) => {
            var k = keyMapper(e), v = valueMapper(e)
            if (mergeFunction && k in state) {
                v = mergeFunction(state[k], v)
            }
            state[k] = v
        }
        downstream.#evaluate()
        return state
    }

    reduce(identity, accumulator) {
        var downstream = this.#createDownstream('reduce'), acc = identity
        downstream.accept = (e) => {
            acc = accumulator(acc, e)
        }
        downstream.#evaluate()
        return acc
    }

    min(comparator) {
        var downstream = this.#createDownstream('min'), min = null
        downstream.accept = (e) => {
            if (min === null || comparator(min, e)) {
                min = e
            }
        }
        downstream.#evaluate()
        return min
    }

    max(comparator) {
        var downstream = this.#createDownstream('max'), max = null
        downstream.accept = (e) => {
            if (max === null || !comparator(max, e)) {
                max = e
            }
        }
        downstream.#evaluate()
        return max
    }

    count() {
        var downstream = this.#createDownstream('count')
        downstream.accept = function (e) {
            if (!this.result) {
                this.result = 0
            }
            this.result++
        }
        downstream.#evaluate()
        return downstream.result
    }

    anyMatch(predicate) {
        var downstream = this.#createDownstream('anyMatch'), state = false
        downstream.accept = function (e) {
            if (predicate(e)) {
                state = true
            }
        }
        this.#buildShortCircuitRequestChain(() => state)
        downstream.#evaluate()
        return state
    }

    allMatch(predicate) {
        var downstream = this.#createDownstream('allMatch'), state = true
        downstream.accept = function (e) {
            if (!predicate(e)) {
                state = false
            }
        }
        this.#buildShortCircuitRequestChain(() => !state)
        downstream.#evaluate()
        return state
    }

    noneMatch(predicate) {
        var downstream = this.#createDownstream('noneMatch'), state = true
        downstream.accept = function (e) {
            if (predicate(e)) {
                state = false
            }
        }
        this.#buildShortCircuitRequestChain(() => !state)
        downstream.#evaluate()
        return state
    }

    findFirst() {
        var downstream = this.#createDownstream('findFirst'), state = null
        downstream.accept = function (e) {
            if (state === null) {
                state = e
            }
        }
        this.#buildShortCircuitRequestChain(() => state !== null)
        downstream.#evaluate()
        return state
    }

    findLast() {
        var downstream = this.#createDownstream('findLast'), state
        downstream.accept = (e) => {
            state = e
        }
        downstream.#evaluate()
        return state
    }

    joining(s) {
        var downstream = this.#createDownstream('joining'), state = null
        downstream.accept = (e) => {
            state = state === null ? e : (state + s + e)
        }
        downstream.#evaluate()
        return state
    }

    #createDownstream(name) {
        var downstream = new Stream()
        downstream.name = name
        downstream.upstream = this
        return downstream
    }

    #evaluate() {
        var terminalStream = this, cur = terminalStream, upstream = cur.upstream
        while (upstream) {
            upstream.wrap(cur)
            cur = upstream
            upstream = cur.upstream
        }

        console.log(terminalStream)

        cur.accept()
    }

    #buildShortCircuitRequestChain(predicate) {
        var shortCircuitStream = this, cur = shortCircuitStream, upstream = cur.upstream
        shortCircuitStream.isShortCircuit = predicate
        while (upstream) {
            let downstream = cur
            if (upstream.isShortCircuit) {
                // when upstream already existed isShortCircuit(), first call your own, then call the following
                let oldFunction = upstream.isShortCircuit
                upstream.isShortCircuit = () => {
                    if (oldFunction()) {
                        return true
                    } else {
                        return downstream.isShortCircuit()
                    }
                }
                break
            } else {
                upstream.isShortCircuit = () => downstream.isShortCircuit()
            }
            cur = upstream
            upstream = cur.upstream
        }
    }

    #buildBarrierRequestChain(barrier) {
        var barrierStream = this, cur = barrierStream, upstream = cur.upstream
        barrierStream.passBarrier = barrier
        while (upstream) {
            if (upstream.passBarrier) {
                // when upstream already existed barrier, it calls downstream passBarrier() after own finish
                break
            } else {
                let downstream = cur
                upstream.passBarrier = () => {
                    downstream.passBarrier()
                }
            }
            cur = upstream
            upstream = cur.upstream
        }
    }

}