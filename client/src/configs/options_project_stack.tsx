import react from "../assets/frameworks/react.png";
import nextjs from "../assets/frameworks/nextjs.png";
import vue from "../assets/frameworks/vue.png";
import streamlit from "../assets/frameworks/streamlit.png";
import express from "../assets/frameworks/express.png";
import fastify from "../assets/frameworks/fastify.png";
import nestjs from "../assets/frameworks/nestjs.png";
import fastapi from "../assets/frameworks/fastapi.png";
import flask from "../assets/frameworks/flask.png";
import sequelize from "../assets/frameworks/sequelize.png";
import prisma from "../assets/frameworks/prisma.png";
import drizzle from "../assets/frameworks/drizzle.png";
import python from "../assets/frameworks/python.png";
import javascript from "../assets/frameworks/javascript.png";
import sqlalchemy from "../assets/frameworks/sqlalchemy.png";
import beanie from "../assets/frameworks/beanie.png";
import postgresql from "../assets/frameworks/postgresql.png";
import mongodb from "../assets/frameworks/mongodb.png";
import rest from "../assets/frameworks/rest.svg";
import graphql from "../assets/frameworks/graphql.svg";

export const optionsProjectStack = {
  apiTypes: [
    { value: "rest", label: "REST", icon: rest },
    { value: "graphql", label: "GraphQL", icon: graphql },
  ],
  languages: [
    { value: "python", label: "Python", icon: python },
    { value: "javascript", label: "JavaScript", icon: javascript },
  ],
  frameworks: {
    python: [
      { value: "fastapi", label: "FastAPI", icon: fastapi },
      { value: "flask", label: "Flask", icon: flask },
    ],
    javascript: [
      { value: "express", label: "Express", icon: express },
      { value: "fastify", label: "Fastify", icon: fastify },
      { value: "nestjs", label: "NestJS", icon: nestjs },
    ],
  },
  databases: [
    { value: "postgresql", label: "PostgreSQL", icon: postgresql },
    { value: "mongodb", label: "MongoDB", icon: mongodb },
  ],
  orms: {
    python: [
      { value: "sqlalchemy", label: "SQLAlchemy", icon: sqlalchemy },
      { value: "beanie", label: "Beanie", icon: beanie },
    ],
    javascript: [
      { value: "sequelize", label: "Sequelize", icon: sequelize },
      { value: "prisma", label: "Prisma", icon: prisma },
      { value: "drizzle", label: "Drizzle", icon: drizzle },
    ],
  },
  frontend: {
    python: [
      {
        value: "streamlit",
        label: "Streamlit",
        icon: streamlit,
      },
    ],
    javascript: [
      {
        value: "nextjs",
        label: "NextJS",
        icon: nextjs,
      },
      {
        value: "react",
        label: "React",
        icon: react,
      },
      {
        value: "vue",
        label: "Vue",
        icon: vue,
      },
    ],
  },
};
