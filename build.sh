#!/bin/bash

# Build script for Chrome extension

mkdir -p build
rm -rf build/*

cp manifest.json build/
cp -r src/ build/
cp -r lib/ build/
cp -r assets/ build/
cp -r icons/ build/
cp -r _locales/ build/

cd build
zip -r ../build.zip *
cd ..
rm -rf build/

mkdir -p target
rm -rf target/*
mv build.zip target/
