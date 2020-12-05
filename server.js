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
    // Show all of the favorite lists in the home page.
    let SQL = `SELECT books.id, authors.name, books.title, books.image_url FROM books JOIN authors ON books.author_id=authors.id;`;
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
    // Whenever we select a certain book...
    // First, we check the selected author's name based on the length of the row...
    let authorName = [request.body.author];
    let SQL = `SELECT * FROM authors WHERE name =  $1`;
    client.query(SQL, authorName)
    .then(results=>{
        console.log(results.rows);
        // if it's already in the 'authors' table, then we only need to enter a row in 'books' table.
        if(results.rows.length === 1) {
            let {title, isbn, image_url, description} = request.body;
            let safeValues = [title, isbn, image_url, description, results.rows[0].id];
            let SQL = `INSERT INTO books (title, isbn ,image_url, description, author_id) VALUES ($1,$2,$3,$4,$5) RETURNING id;`;
            client.query(SQL, safeValues)
            .then(result=>{
                response.redirect(`/books/${result.rows[0].id}`);
            })
            .catch((error)=>{
                response.render('pages/error', {errors: error});
            });
        // if not, then we need to enter row in both tables (authors and books)
        } else if (results.rows.length === 0) {
            let SQL = `INSERT INTO authors (name) VALUES ($1) RETURNING id;`;
            let safeValue = [request.body.author];
            client.query(SQL, safeValue)
            .then(result=>{
                let {title, isbn, image_url, description} = request.body;
                let safeValues = [title, isbn, image_url, description, result.rows[0].id];
                let SQL = `INSERT INTO books (title, isbn ,image_url, description, author_id) VALUES ($1,$2,$3,$4,$5) RETURNING id;`;
                client.query(SQL, safeValues)
                .then(results=>{
                    response.redirect(`/books/${results.rows[0].id}`);
                })
                .catch(error=>{
                    response.render('pages/error', {errors: error});
                })
            })
            .catch(error=>{
                response.render('pages/error', {errors: error});
            });
        }
    })
    .catch(error=>{
        response.render('pages/error', {errors: error});
    });
}

function updateBook(request, response) {
    // Updates (author's name, book's description, book's image, book's isbn and book's title)
    // in both tables
    let SQL = `UPDATE books SET title=$1, isbn=$2, image_url=$3, description=$4 WHERE id=$5;`;
    let getID = request.params.id;
    let {title, isbn, image_url, description} = request.body;
    let safeValues = [title, isbn, image_url, description, getID];
    console.log(request.body);
    client.query(SQL, safeValues)
    .then(()=>{
        let SQL = `UPDATE authors SET name=$1 WHERE id=$2`; 
        // need the author_id column from table 'books' to update the selected author...
        // in the 'authors' table.
        let safeValues = [request.body.name, request.body.author_id];
        client.query(SQL, safeValues)
        .then(()=>{
            response.redirect(`/books/${request.params.id}`);
        })
        .catch(error=>{
            response.render('pages/error', {errors: error});
        });
    })
    .catch(error=>{
        response.render('pages/error', {errors: error});
    });
}

function deleteBook (request, response) {
    // First we get all of the rows in 'books' table 
    // to ckeck if the author name has several books inside our favorite lists
    // All of that will be done by getting the 'author_id' column in the 'books' table 
    let SQL = `SELECT * FROM books`;
    client.query(SQL)
    .then(results=>{
        let authorID = request.body.author_id;
        let duplicateAuthorID = results.rows.reduce((acc, val)=>{
            if(val.author_id == authorID) {
                acc.push(val.author_id);
            }
            return acc;
        }, []);
        console.log(duplicateAuthorID);
        // Checking if we have a duplicate values of 'author_id' inside our favorite lists
        if (duplicateAuthorID.length > 1) { // if yes
            // Then only delete from the selected row from the 'books' table.
            let SQL = `DELETE FROM books WHERE id=$1;`;
            let getID = request.params.id;
            let safeValue = [getID];
            client.query(SQL, safeValue)
            .then(()=>{
                response.redirect('/');
            })
            .catch(error=>{
                response.render('pages/error', {errors: error});
            });
        } else if (duplicateAuthorID.length === 1) { // if now
            // Then delete the author name row in the 'authors' table.
            // Also only delete from the selected row from the 'books' table. 
            let SQL = `DELETE FROM books WHERE id=$1;`;
            let getID = request.params.id;
            let safeValue = [getID];
            client.query(SQL, safeValue)
            .then(()=>{
                let SQL = `DELETE FROM authors WHERE id=$1;`;
                let safeValue = [authorID];
                client.query(SQL, safeValue)
                .then(()=>{
                    response.redirect('/');
                })
                .catch(error=>{
                    response.render('pages/error', {errors: error});
                });
            })
            .catch(error=>{
                response.render('pages/error', {errors: error});
            });
        }
    })
    .catch(error=>{
        response.render('pages/error', {errors: error});
    });
}

function  detailFavorite(request, response) {
    // This query select the majority of columns in 'books' and 'authors' tables
    // render them in the detail.ejs
    let SQL = `SELECT books.id, authors.name, books.author_id, books.title, books.description, books.isbn, books.image_url FROM books JOIN authors ON authors.id=books.author_id WHERE books.id=$1;`;
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
    // Display the search 'input' and radio buttons to search on books
    // based on either author or title.
    response.render('pages/searches/new');
}

function searchResults (request, response) {
    // Getting results from Google Books API
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

// Constructor Object => book
function Book(data) {
    // Make the image url as 'https' type to not end up with mix contents issue.
    if (data.volumeInfo.imageLinks === undefined){
        this.image = 'https://i.imgur.com/J5LVHEL.jpg';
    } else {
        if(data.volumeInfo.imageLinks.smallThumbnail[4] === 's') {
            this.image = data.volumeInfo.imageLinks.smallThumbnail;
        } else {
            this.image = 'https' + data.volumeInfo.imageLinks.smallThumbnail.slice(4);
        }
    }
    // Give a default value for each item if it is already not available.
    this.title = data.volumeInfo.title ? data.volumeInfo.title : 'Title is not available!';
    this.author = data.volumeInfo.authors ? data.volumeInfo.authors[0] : 'Author is not available!';
    this.description = data.volumeInfo.description ? data.volumeInfo.description : 'Description is not available!';
    this.isbn = data.volumeInfo.industryIdentifiers ? data.volumeInfo.industryIdentifiers[0].type + ' ' + data.volumeInfo.industryIdentifiers[0].identifier: "Isbn is not available";
}

// Connect to PORT
client.connect()
.then(()=>{
    app.listen(PORT, ()=>{
        console.log(`We heard the PORT ${PORT}`);
    });

})

