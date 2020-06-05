'use strict'

var mongoose = require('mongoose');
var app = require ('./app');
var port = 3800; 

//Conexción data base
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/mean_social')
    .then(() => {
        console.log("La conexión se ha realizado con exitó");
    
    
        //crear servidor
        app.listen(port, () =>{
            console.log('el servidor esta corriendo' );
        });
    })
    .catch(err => console.log(err));