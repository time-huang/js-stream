# stream.js  
Jump to [chinese](doc/README_CN.md) document

stream.js is a Javascript file written with reference to the Java Stream API.  
Let JavaScript user use array by java stream way.  
All stream operation has tow style：intermediate operation and terminal operation.  
+ intermediate operation: Compute will not be executed immediately. You can continue to add intermediate operation or terminate operation.  
+ terminal operation: Immediately trigger to compute, first execute the previous all intermediate operations by ordered, and finally execute the termination operation.

| intermediate operation | terminal operation |
|:----------------------:|:------------------:|
|         filter         |      forEach       |
|          map           |      toArray       |
|        flatMap         |       toMap        |
|        distinct        |       reduce       |
|         sorted         |        min         |
|          peek          |        max         |
|         limit          |       count        |
|          skip          |      anyMatch      |
|                        |      allMatch      |
|                        |     noneMatch      |
|                        |     findFirst      |
|                        |      findLast      |
|                        |      joining       |


## Usage
In the html:

```html

<script src="stream.js"></script>
<script>
    var sum = Stream.of([1,2,3,4,5]).map(n => n * 10).reduce(0, (acc, b) => acc + b)
    console.log(sum)
</script>
```

or In the browser View [index.xml](doc/index.html) to learn more, including use cases for all intermediate operations and all terminal operations
