# stream.js

stream.js是一个参考Java Stream API编写的Javascript文件。  
让JavaScript用户通过java Stream的方式使用数组。  
所有stream操作有两种类型：中间操作和终结操作。
+ 中间操作：计算不会立即执行。您可以继续添加中间操作或终止操作  
+ 终结操作：立即触发计算，先按顺序执行前面的所有中间操作，最后执行终结操作。

|   中间操作   |   终结操作    |
|:--------:|:---------:|
|  filter  |  forEach  |
|   map    |  toArray  |
| flatMap  |   toMap   |
| distinct |  reduce   |
|  sorted  |    min    |
|   peek   |    max    |
|  limit   |   count   |
|   skip   | anyMatch  |
|          | allMatch  |
|          | noneMatch |
|          | findFirst |
|          | findLast  |
|          |  joining  |


## Usage
In the html:

```html

<script src="stream.js"></script>
<script>
    var sum = Stream.of([1,2,3,4,5]).map(n => n * 10).reduce(0, (acc, b) => acc + b)
    console.log(sum)
</script>
```

or 在浏览器中查看[index.xml](index.html)了解更多, 包括所有中间操作和所有终端操作的用例。
