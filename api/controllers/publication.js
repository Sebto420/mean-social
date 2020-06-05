'use strict'

var path = require('path');
var fs = require ('fs');
var moment = require ('moment');
var mongoosePaginate = require ('mongoose-pagination');

var Publication = require ('../models/publication');
var User = require ('../models/user');
var Follow = require ('../models/follow');

function probando (req, res){
    res.status(200).send({ 
        message: 'Hola desde el controlador de public'
    });
}

//Metodo dar de alta publicaciones

function savePublication(req, res){
      var params = req.body;      

      if(!params.text) return ServiceUIFrameContext.status(200).send({message: 'Introducir texto!!'});

      var publication = new Publication();
      publication.text = params.text;
      publication.file = 'null';
      publication.user = req.user.sub;
      publication.created_at = moment().unix();

        publication.save((err, publicationStored) => {
            if(err) return res.status(500).send({message: 'Error al guardar la publicacion'});
            
            if(!publicationStored) return res.status(404).send({message: 'La publicación no ha sido guardada'})
        
            return res.status(200).send({publication: publicationStored});
        });
}


//Metodo publicaciones de los usuarios que seguimos

function getPublications(req, res){
    var page = 1;
    if(req.params.page){
        page = req.params.page;
    }

    var itemsPerPage = 4;

    Follow.find({user: req.user.sub}).populate('followed').exec((err, follows) =>{
       if(err) return res.status(500).send({message: 'Error devolver el seguimiento'});

       var follows_clean = [];

       follows.forEach((follow) => {
           follows_clean.push(follow.followed);
       });
       follows_clean.push(req.user.sub);

       Publication.find({user: {"$in": follows_clean}}).sort('-created_at').populate('user').paginate(page, itemsPerPage, (err, publications, total) =>{

        if(err) return res.status(500).send({message: 'Error al devolver publicaciones'});

        if(!publications) return res.status(404).send({message: 'No hay publicaciones'});

        return res.status(200).send({
            total_items: total,
            pages: Math.ceil(total/itemsPerPage),
            page: page,
            publications
        });
       });
    });

}

// Devolver una publicación

function getPublication(req, res){
    var publicationId = req.params.id;

    Publication.findById(publicationId, (err, publication) =>{
        if(err) return res.status(500).send({message: 'Error al devolver la publicación'});

        if(!publication) return res.status(404).send({message: 'La publicación no existe'});

        return res.status(200).send({publication});
    });
}

//Metodo delete publication

function deletePublication (req, res){
    var publicationId = req.params.id;

    Publication.find({'user': req.user.sub, '_id': publicationId})
        .remove((err, publicationRemoved) => {
            if(err) return res.status(500).send({message: 'Error al borrar la publicación'});

            if(!publicationRemoved) return res.status(400).send({message: 'No se ha borrado la publicación'});

            if(publicationRemoved.n == 1){
                return res.status(200).send({message: 'Publicación eliminada correctamente'});
            }else{
                return res.status(404).send({message: 'Error borrando la publicación'});
            }
        });

}


function uploadImage (req, res){

    var publicationId = req.params.id;
    
   
    if(req.files){
        var file_path = req.files.image.path;
    
        var file_split = file_path.split('\\');
    
        var file_name = file_split[2];
          
        var ext_split = file_name.split('\.');
       
        var file_ext = ext_split[1];
        
        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){

            Publication.findOne({'user': req.user.sub, '_id': publicationId}).exec((err, publication)=>{
                console.log(publication);
                if(publication){
                    //Actualizar documento de publicacion
                    Publication.findByIdAndUpdate(publicationId, {file: file_name}, {new: true}, (err, publicationUpdated) => {
                    if(err) return res.status(500).send({message: 'Error en la petición'});
    
                    if(!publicationUpdated) return res.status(404).send({message: 'No se ha podido actualizar el uruario'});
            
                    return res.status(200).send({publication: publicationUpdated});  
                    });
                }else{
                    return removeFilesOfUploads (res, file_path,  'No tienes permiso');
                }

            });
                
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
    var path_file = './uploads/publications/' + image_file;

    fs.exists (path_file, (exists) => {
        if(exists){
            res.sendFile(path.resolve(path_file));
        }else{
            res.status(200).send({message: 'No existe la imagen'});
        }
    });

}



module.exports = {
    probando,
    savePublication,
    getPublications,
    getPublication,
    deletePublication,
    uploadImage,
    getImageFile

}