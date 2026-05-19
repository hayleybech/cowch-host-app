<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
//    return Inertia::render('Welcome');
    return Inertia::render('Games/CowGame');
})->name('home');

//Route::get('/cowwwch', function () {
//    return Inertia::render('Games/snakes');
//})->name('snake');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
