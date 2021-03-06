// required
const db = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config()
const secretToken = process.env.secretToken

// création d'un utilisateur
exports.signup = async (req, res) => {
  try {
    // récupération des données saisies
      const lastname = req.body.lastname; 
      const firstname = req.body.firstname;
      const email = req.body.email;
      const password = req.body.password;
      const profileImageUrl = `${req.protocol}://${req.get('host')}/images/default-icon.png`
    // controle des données saisies pour l'email
      const regExpMail = /^[a-zA-Z0-9._-]+[@]{1}[a-zA-Z0-9._-]+[.]{1}[a-z]{2,8}$/;
      const validEmail = regExpMail.test(email);
     
      if (!lastname || !firstname || !password || !email ) {
        return res.status(400).json({ error: "Informations manquantes...." });
      }
      else if(!validEmail) {
        return res.status(401).json({ error: "Format du mail incorrect" });
      }
      else{
        //verification si l'utilisateur n'est pas déjà existant
        let user = await db.User.findOne({ where: { lastname, firstname } })

        if (user) {
            return res.status(401).json({ error: "Utilisateur déjà existant..." });
        }
        else{
            bcrypt.hash(password, 10)
              .then(hash => {
                  db.User.create({
                    firstname, lastname, email, password : hash, profileImageUrl
                  })
                  .then(()=>  res.status(201).json({ message: "Utilisateur créé avec succès !" }))
                  .catch(error => res.status(500).json({ error : "erreur lors de la création de l'utilisateur"}))
                })
              .catch(error => res.status(500).json({error : "erreur serveur"}))
        }
      }
  } catch (error) {
      return res.status(500).json({ error : "erreur serveur" });
  }
};

// connexion d'un utilisateur
exports.login = async (req, res) => {
  try {
      const email = req.body.email;
      const password = req.body.password;
      // contrôle de l'email envoyé
      const regExpMail = /^[a-zA-Z0-9._-]+[@]{1}[a-zA-Z0-9._-]+[.]{1}[a-z]{2,8}$/;
      const validEmail = regExpMail.test(email);


      if(!email || !password || !validEmail){
        return res.status(400).json({ error: "Tous les champs doivent être correctement renseignés !" });
      }

     await db.User.findOne({ where : { email }})
      .then(user => {
          if(!user){
              return res.status(401).json({error :  "Utilisateur non trouvé !"})
          }
          bcrypt.compare(password, user.password)
                    .then( valid => {
                        if(!valid){
                            res.status(401).json({ error : " Mot de passe incorrect !" })
                        }
                        console.log("id de lui : " + user.id)
                        res.status(200).json({ 
                            userId : user.id,
                            token : jwt.sign(      
                                {userId : user.id, isAdmin : user.isAdmin},
                                secretToken,                               
                                {expiresIn : '12h'}
                            ),
                        })
                    })
                    .catch(error => res.status(500).json({ error : "erreur de cryptage token" }))
      })
      .catch(error => res.status(500).json({ error : "erreur serveur" }))
  }
  catch (error){
    return res.status(500).json({ error : "problème pour login" })
  }
};

// récupération d'un utilisateur
exports.getOneUser = async (req, res) => {
  try{
      const token = req.headers.authorization.split(' ')[1];
      const decodedToken = jwt.verify(token, secretToken);
      const id = decodedToken.userId
    
      await db.User.findOne({
          where : { id }, 
         attributes : ["id", "lastname", "firstname", "email", "profileImageUrl", "isAdmin"]
      })
          .then(user => {
            res.status(200).json({user
            })
          })
          .catch((error) => res.status(500).json({ error })) 
  } catch (error){
      res.status(401).json({
      error })
  }
};

// suppression d'un utilisateur
exports.deleteUser = async (req, res) => {
  try{
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, secretToken);
    const id = decodedToken.userId

    await db.User.destroy({ where: { id } })
    .then(() => {
      res.status(200).json({
        message: "suppression du compte effectuée "
      })
    })
    .catch((error) => res.status(400).json({ error : "erreur lors de la suppression de l'utilisateur" }))
  }
  catch (error) {
    res.status(400).json({ error })
  }
}

// modification de la photo de profil d'un utilisateur
exports.addProfilePhoto = async (req, res) => {
  try{
      const token = req.headers.authorization.split(' ')[1];
      const decodedToken = jwt.verify(token, secretToken);
      const id = decodedToken.userId
      console.log("user id : " + id )
      const profileImageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
  
      await db.User.update({ profileImageUrl }, { where : { id }})
          .then(user => {
            res.status(200).json({user,
              message: "mise à jour du profil effectué "
            })
          })
          .catch((error) => res.status(400).json({ error }))
  } 
  catch (error) {
      res.status(402).json({
       error })
  }
};

// obtention de tous les utilisateurs pour l'admin
exports.getAllUsers = async (req, res) => {
  try{
    await db.User.findAll({ attributes : [ "id", "firstname", "lastname", "isAdmin", "email"] })
      .then( users => {
        res.status(200).json({users})
      })
      .catch((error) => res.status(400).json({ error }))
  } catch {
    res.status(402).json({
      message : "erreur de récupération des utilisateurs" })
  }
};

// suppression d'un utilisateur par l'admin
exports.deleteUserByAdmin = async (req, res) => {
  try{
    id = req.body.userToDelete
    console.log("req id")
    console.log(req.body.userToDelete)
    await db.User.destroy({ where: { id } })
    .then(() => {
      res.status(200).json({
        message: "suppression de l'utilisateur effectuée "
      })
    })
    .catch((error) => res.status(400).json({ error : "erreur lors de la suppression de l'utilisateur"}))
  } catch {
    res.status(500).json({
      error : "erreur lors de la tentative de connexion au serveur" })
  }
};

// désignation d'un autre utilisateur comme admin
exports.giveAdminGrant = async (req, res) => {
  try{
    id = req.body.userToDelete
    console.log("req id")
    console.log(req.body.userToDelete)
    await db.User.update({ isAdmin : true }, { where: { id } })
    .then(() => {
      res.status(200).json({
        message: "ajout du privilège admin à l'utilisateur effectuée "
      })
    })
    .catch((error) => res.status(400).json({ error : "erreur lors de l'ajout du privilège"}))
  } catch {
    res.status(500).json({
      error : "erreur lors de la tentative de connexion au serveur" })
  }
};