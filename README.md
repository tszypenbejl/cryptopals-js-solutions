# Solutions to [the cryptopals crypto challenges](https://cryptopals.com/) in JavaScript

The solutions in this repository are written in modern JavaScript (as of 2020) and are provided in two flavours: for Node.js and for web browser. The `challenge*.js` files contain solutions for Node.js and can be run by simply executing them with node (e.g. `node challenge1.js`) - no need to install any npm packages beforehand. The `challenge*.html` files contain solutions for web browser and can be simply opened in any contemporary web browser (I verified they work in Firefox and Chromium).

Every solution is self-contained in the sense there is no shared code used by solutions. Thus it is very easy to see how much code was need to solve a challenge. However, various functions or modules available in Node.js and web browsers are utilized where possible. Solution to challenge 7 for the browser uses a 3rd party library, as apparently it is allowed and suggested as the easiest way. Also, data files for the challenges are kept separately.

The goal is to keep the code brief, functional-style, simple, and performing reasonably well.

So far only solutions to the challenges from [Set 1](https://cryptopals.com/sets/1) are available.
