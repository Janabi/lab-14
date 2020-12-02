'use strict';
// App Dependencies
const express = require('express');

require('dotenv').config();

const app = express();
const superagent = require('superagent');
const methodOverride = require('method-override');

const PORT = process.env.PORT;
// App Setups
app.use(express.static('./public'));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
const pg = require('pg');
const { request, response } = require('express');
const client = new pg.Client(process.env.DATABASE_URL);

// Routes:
app.get('/', mainPage);
app.post('/books', favoriteBook);
app.get('/books/:id', detailFavorite);
app.get('/searches/new', searchBooks);
app.post('/searches', searchResults);
app.put('/books/:id', updateBook);
app.delete('/books/:id', deleteBook);

function mainPage (request, response) {
    let SQL = `SELECT * FROM books;`;
    client.query(SQL)
    .then(results =>{
        console.log(results.rows);
        response.render('pages/index', {books: results.rows});
        console.log('there is data');
        
    })
    .catch((error)=>{
        response.render('pages/error', {errors: error});
    })
}

function favoriteBook (request, response) {
    let SQL = `INSERT INTO books (title, author, isbn, image_url, description) VALUES ($1,$2,$3,$4,$5) RETURNING *;`;
    let {title, author, isbn, image_url, description} = request.body;
    let safeValues = [title, author, isbn, image_url, description];
    console.log(request.body.title);
    console.log('hello')
    client.query(SQL, safeValues)
    .then(result=>{
        response.redirect(`/books/${result.rows[0].id}`);
    })
    .catch((error)=>{
        response.render('pages/error', {errors: error});
    });
}

function updateBook(request, response) {
    let SQL = `UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5 WHERE id=$6;`;
    let getID = request.params.id;
    let {title, author, isbn, image_url, description} = request.body;
    let safeValues = [title, author, isbn, image_url, description, getID];
    client.query(SQL, safeValues)
    .then(()=>{
        response.redirect(`/books/${request.params.id}`);
    })
}

function deleteBook (request, response) {
    let SQL = `DELETE FROM books WHERE id=$1;`;
    let getID = request.params.id;
    let safeValue = [getID];
    client.query(SQL, safeValue)
    .then(()=>{
        response.redirect('/');
    })
}

function  detailFavorite(request, response) {
    let SQL = `SELECT * FROM books WHERE id = $1;`;
    let safeValue = [request.params.id];
    client.query(SQL, safeValue)
    .then(results=>{
        response.render('pages/books/detail', {books: results.rows[0]});
    })
    .catch((error)=>{
        response.render('pages/error', {errors: error});
    });
}

function searchBooks (request, response){
    response.render('pages/searches/new');
}

function searchResults (request, response) {
    let query_search = request.body.searchEngine;
    let category = request.body.category;
    
    let url=`https://www.googleapis.com/books/v1/volumes?q=${query_search}+${category}:${query_search}&startIndex=0&maxResults=10`;

    superagent.get(url)
    .then(result=>{
        let books = result.body.items.map(data=>{
            return new Book(data);
        });
        response.render('pages/searches/show', {book: books});
    })
    .catch((error)=>{
        response.render('pages/error', {errors: error});
    });
}

function Book(data) {
    if (data.volumeInfo.imageLinks === undefined){
        this.image = 'https://i.imgur.com/J5LVHEL.jpg';
    } else {
        if(data.volumeInfo.imageLinks.smallThumbnail[4] === 's') {
            this.image = data.volumeInfo.imageLinks.smallThumbnail;
        } else {
            this.image = 'https' + data.volumeInfo.imageLinks.smallThumbnail.slice(4);
        }
        
    }
    this.title = data.volumeInfo.title ? data.volumeInfo.title : 'Title is not available!';
    this.author = data.volumeInfo.authors ? data.volumeInfo.authors[0] : 'Author is not available!';
    this.description = data.volumeInfo.description ? data.volumeInfo.description : 'Description is not available!';
    this.isbn = data.volumeInfo.industryIdentifiers ? data.volumeInfo.industryIdentifiers[0].type + ' ' + data.volumeInfo.industryIdentifiers[0].identifier: "Isbn is not available";
}

client.connect()
.then(()=>{
    app.listen(PORT, ()=>{
        console.log(`We heard the PORT ${PORT}`);
    });

})

