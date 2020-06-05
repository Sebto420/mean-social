'use strict'

var bcrypt = require ('bcrypt-nodejs');
var mongoosePaginate = require ('mongoose-pagination');
var fs = require('fs');
var path = require('path');

var User = require ('../models/user');
var Follow = require ('../models/follow');
var Publication = require ('../models/publication');
var jwt = require('../services/jwt');


//Metodos de prueba
function home (req, res) {
    res.status(200).send({
        mesage: 'Quispas desde el servidor NODEJS'
    })
}

function pruebas (req, res) {
    console.log(req.body);
    res.status(200).send({
        mesage: 'Purebas en el servidor NODEJS'
    })
}


//Metodo registro
function saveUser(req, res){
    var params = req.body;
    var user = new User();

    if(params.name && params.surname && params.nick && params.email && params.password){

        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email; 
        user.role = 'ROLE_USER';
        user.image = null;

        //Controllar usuarios duplicados
        User.find ({ $or: [
            {email: user.email.toLowerCase()},
            {nick: user.nick.toLowerCase()}
        ]}).exec((err, users) => {
            if(err) return res.status(500).send ({message: 'Error el el request'});

            if(users && users.length >= 1)
             {return res.status(200).send ({message: 'El usuario ya existe'})
             }else{
                  //Cofrado de password y guardado de usuario
        bcrypt.hash(params.password, null, null, (err, has) =>{
            user.password = has;

            user.save((err, userStored)=> {
                if(err) return res.status(500).send({message: 'Error al guardar usuario'});

                if(userStored){
                    res.status(200).send({user: userStored});
                } else{
                    res.status(404).send({message: 'Usuario no registrado'});
                }

            });
        })
             }
        
        })    

    } else {
        res.status(200).send({
            mesage: 'Completa los campos obligatorios'
        })
    }
};


//Metodo login
function loginUser(req, res){
    var params = req.body;
    

    var email = params.email;
    var password = params.password;
   

    User.findOne({email: email}, (err, user) => {

        if(err) return res.status(500).send({message: 'Error en la petición'});
        
        if(user){
            bcrypt.compare(password, user.password, (err, check) => {
                if (check){

                 //devuelve datos de usuario
                    if(params.gettoken){

                            //generar y Devolver un token
                            return res.status(200).send({
                                token: jwt.createToken(user)
                            });
                    }else{
                        user.password = undefined;
                        return res.status(200).send({user})
                    }

                
                }else{
                    return res.status(404).send({message: 'Usuario no identificado'})
                }
            });
        }else{
            return res.status(404).send({message: 'Usuario no identificado!!'})
        }
    });
}

//Metodo datos de usuario

function getUser(req, res){
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if(err) return res.status(500).send({message: 'Error en la petición'});
        
        if(!user) return res.status(404).send({message: 'Usuario no existe'});
        
        followThisUser(req.user.sub, userId).then((value) => {
            user.password=undefined;
            return res.status(200).send({
                user, 
                following: value.following,
                followed: value.followed
            });
        });        
    });
}

async function followThisUser(identity_user_id, user_id){
    var following = await  Follow.findOne({ user : identity_user_id, followed: user_id}).exec().then((following) => {
        return following;
    })
    .catch((err) => {
        return handleError(err);
    });

    var followed = await Follow.findOne({user: user_id, followed: identity_user_id}).exec().then((followed) => {
        return followed;
    })
    .catch((err) => {
        return handleError(err);
    });

    return {
        
        following: following,
        followed: followed,
       
    };
}

//Metodo devolver listado de usuarios paginado

function getUsers(req, res){
    var identity_user_id = req.user.sub;

    var page = 1;
    if(req.params.page){
        page = req.params.page;
    }

    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) =>{
        if(err) return res.status(500).send({message: 'Error en la petición', err});
        if(!users) return res.status(404).send({message: 'No hay usuarios disponibles'});

        followUsersIds(identity_user_id).then((value) =>{

            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                pages: Math.ceil(total/itemsPerPage)
    
            });
        });
       
    });
}


//
async function followUsersIds (user_id){
    var following  = await Follow.find({'user': user_id}).select({'_id':0, '__V':0, 'user':0}).exec()
    .then((follows) => {
        return follows;
    })
    .catch((err) => {
        return handleError(err);
    });

    var followed = await Follow.find({followed:user_id}).select({'_id':0, '__V':0, 'followed':0 }).exec()
    .then((follows) => {
        return follows;
    })
    .catch((err) => {
        return handleError(err);
    });

    var following_clean = [];

    following.forEach((follow) => {
        following_clean.push(follow.followed);
    });

    var followed_clean = [];

    followed.forEach((follow) => {
        followed_clean.push(follow.user);
    });

    return {
        following: following_clean,
        followed: followed_clean
    }
}

// MEtodo contador usuarios que sigo y que me siguen

function getCounters(req, res){
    var userId = req.user.sub;
    if(req.params.id){
        userId = req.params.id;
    }

    getCountFollow(userId).then((value) =>{
        return res.status(200).send(value);
    });
}

async function getCountFollow(user_id){
    var following = await Follow.countDocuments({'user': user_id})
    .exec()
    .then((count) => {
        console.log(count);
        return count;
    })
    .catch((err) =>{ 
        return handleError(err);
    });
    

    var followed = await Follow.countDocuments({'followed': user_id})
    .exec()
    .then((count) =>{
        return count;
    })
    .catch((err) =>{
        return handleError(err);
    });

    var publications = await Publication.countDocuments({'user': user_id})
    .exec()
    .then((count) => {
        return count;
    })
    .catch((err)=>{
        return handleError;
    });

    return {
        following: following,
        followed: followed,
        publications: publications
    }
}



// Edición de datos de usuario
function updateUser(req, res){
    var userId = req.params.id;
    var update = req.body;

    //Borrar propiedad password
    delete update.password;

    if(userId != req.user.sub){
        return res.status(500).send({message: 'Not tienes parmiso para modificar los datos'});
    }

    User.findByIdAndUpdate(userId, update, {new: true}, (err, userUpdated) =>{
        if(err) return res.status(500).send({message: 'Error en la petición'});

        if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el uruario'});
    
        return res.status(200).send({user: userUpdate});
    });
}


//Metodo Subir archivos de imagen / avatar

function uploadImage (req, res){

    var userId = req.params.id;
    
   
    if(req.files){
        var file_path = req.files.image.path;
        console.log(file_path);

        var file_split = file_path.split('\\');
        console.log(file_split);

        var file_name = file_split[2];
        console.log(file_name);
        
        var ext_split = file_name.split('\.');
        console.log(ext_split);

        var file_ext = ext_split[1];
        console.log(file_ext);

        if(userId != req.user.sub){
            return removeFilesOfUploads (res, file_path,  'No tienes permiso para actualizar los datos');
            
        }
    

        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
            //Actualizar documento de usuario logeado
            User.findByIdAndUpdate(userId, {image: file_name}, {new: true}, (err,userUpdated) => {
            if(err) return res.status(500).send({message: 'Error en la petición'});

            if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar el uruario'});
    
            return res.status(200).send({user: userUpdated});  
            })
        }else{
            return removeFilesOfUploads (res, file_path,  'La extension no es valida');
        }
    }

}


function removeFilesOfUploads (res, file_path, message){
    fs.unlink(file_path, (err) => {
        return res.status(200).send({message: message});
    });
}


function getImageFile (req, res){
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists (path_file, (exists) => {
        if(exists){
            res.sendFile(path.resolve(path_file));
        }else{
            res.status(200).send({message: 'No existe la imagen'});
        }
    });

}


module.exports = {
    home, 
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile
}
