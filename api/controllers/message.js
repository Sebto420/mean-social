'use strict'

var moment = require('moment');
var mongoosePagination = require ('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');
var Message = require('../models/message');

function prueba(req, res){
    res.status(200).send({message: 'Prueba mensajeria'});
}

function saveMessage (req, res){
    var params = req.body;

    if(!params.text || !params.receiver) return res.status(200).send({message: 'Llena los datos necesarios'});

    var message = new Message();
    message.emmiter = req.user.sub;
    message.receiver = params.receiver;
    message.text = params.text;
    message.created_at = moment().unix();
    message.viewed = false;

    message.save((err, messageStored) =>{
        if(err) return res.status(500).send({ message: 'Error en la petición'});
        if(!messageStored) return res.status(500).send({ message: 'Error al enviar el mensaje'});

        return res.status(200).send({message: messageStored});
    });
}

function getReceivedMessages(req, res){
    var userId = req.user.sub;

    var page = 1;
    if(req.params.page){
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Message.find({receiver: userId}).populate('emmiter', 'name surname image nick _id' ).paginate(page, itemsPerPage, (err, messages, total) => {
        if (err) return res.status(500).send({message: 'Error en la petición'});
        if(!messages) return res.status(404).send({message: 'no hay mensajes'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPage),
            messages
        });
    });
}

function getEmmitMessages(req, res){
    var userId = req.user.sub;

    var page = 1;
    if(req.params.page){
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Message.find({emmiter: userId}).populate('emmiter receiver', 'name surname image nick _id' ).paginate(page, itemsPerPage, (err, messages, total) => {
        if (err) return res.status(500).send({message: 'Error en la petición'});
        if(!messages) return res.status(404).send({message: 'no hay mensajes'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPage),
            messages
        });
    });
}

function getUnviewedMessage (req, res){
    var userId = req.user.sub;
    
    Message.count({receiver : userId, viewed : 'false'}).exec((err, count) =>{
        if(err)return res.status(500).send({message: 'Error en la petición'});

        return res.status(200).send({
            'viewed': count,
        });
    });
}

function setViewedMessages (req, res){
    var userId = req.user.sub;

    Message.update({receiver : userId, viewed : 'false'}, {viewed: 'true'}, {multi: 'true'}, (err, messagesUpdated) =>{
        if(err) return res.status(500).send({message: ' Error en la petición'});

        return res.status(200).send({
            messages: messagesUpdated,
        })
    })


}

module.exports = {
    prueba,
    saveMessage,
    getReceivedMessages,
    getEmmitMessages,
    getUnviewedMessage,
    setViewedMessages
};