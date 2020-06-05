'use strict'

//var path = require('path');
//var fs = require('fs');
var mongoosePaginate = require ('mongoose-pagination');

//Cargar los modelos
var User = require('../models/user');
var Follow = require('../models/follow');

//Metodos save follow
function saveFollow(req, res){
    var params = req.body;
    var follow = new Follow();
    follow.user = req.user.sub;
    follow.followed = params.followed;

    follow.save((err, followStored)=> {
        if(err) return res.status(500).send({message: 'Error al guardar seguimiento'});
        if(!followStored) return res.status(404).send({message: 'El seguimiento no se ha fuardado'});

        return res.status(200).send({followStored});
    });
}


//Mwtodo dejar de seguir
function deleteFollow(req, res){
    var userId = req.user.sub;
    var followId = req.params.id;

    Follow.find({'user': userId, 'followed': followId}).remove(err =>{
        if(err) return res.status(500).send({message: 'Error al dejar de seguir'});

        return res.status(200).send({message: 'El follow se ha eliminado'});
    });

}

//Metodo listado de follows
function getFollowingUsers (req, res){
    var userId = req.user.sub;

    if(req.params.id && req.params.page){
        userId = req.params.id;
    }

    var page = 1;

    if(req.params.page){
        page = req.params.page;
    }else{
        page= req.params.id;
    }

    var itemsPerPages = 4;

    Follow.find({user: userId}).populate({path: 'followed'}).paginate(page, itemsPerPages, (err, follows, total) => {
        if(err) res.status(500).send({message: 'Error en el servidor'});

        if(!follows) res.status(404).send({message: 'No sigues a nadie'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPages),
            follows
        })
    });

}

//Metodo para listar usuarios que nos siguen 
function getFollowedUsers (req, res){
    var userId = req.user.sub;

    if(req.params.id && req.params.page){
        userId = req.params.id;
    }

    var page = 1;

    if(req.params.page){
        page = req.params.page;
    }else{
        page= req.params.id;
    }

    var itemsPerPages = 4;

    Follow.find({followed: userId}).populate('user').paginate(page, itemsPerPages, (err, follows, total) => {
        if(err) res.status(500).send({message: 'Error en el servidor'});

        if(!follows) res.status(404).send({message: 'No te sigue nadie'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPages),
            follows
        })
    });
}

//Devolver listado de follows/usuarios sin paginar
function getMyFollows(req, res){
    var userId = req.user.sub;
    

    var find = Follow.find({user: userId});

    if (req.params.followed){
        find = Follow.find({followed: userId});
    }

    find.populate('user followed').exec((err, follows) =>{

        if(err) return res.status(500).send({message: 'Error en el servidor'});

        if(!follows) return res.status(404).send({message: 'No sigues ningun usuario'});

        return res.status(200).send({follows});
    });
}

module.exports = {
    
    saveFollow,
    deleteFollow,
    getFollowingUsers,
    getFollowedUsers,
    getMyFollows
}