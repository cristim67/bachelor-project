import react from "../assets/frameworks/react.png";
import nextjs from "../assets/frameworks/nextjs.png";
import vue from "../assets/frameworks/vue.png";
import streamlit from "../assets/frameworks/streamlit.png";
import express from "../assets/frameworks/express.svg";
import nestjs from "../assets/frameworks/nestjs.svg";
import fastapi from "../assets/frameworks/fastapi.png";
import flask from "../assets/frameworks/flask.png";
import sequelize from "../assets/frameworks/sequelize.svg";
import prisma from "../assets/frameworks/prisma.svg";
import drizzle from "../assets/frameworks/drizzle.png";
import python from "../assets/frameworks/python.png";
import javascript from "../assets/frameworks/javascript.svg";
import sqlalchemy from "../assets/frameworks/sqlalchemy.png";
import beanie from "../assets/frameworks/beanie.png";
import postgresql from "../assets/frameworks/postgresql.svg";
import mongodb from "../assets/frameworks/mongodb.svg";
import rest from "../assets/frameworks/rest.svg";
import graphql from "../assets/frameworks/graphql.svg";
import tailwind from "../assets/frameworks/tailwind.svg";
import bootstrap from "../assets/frameworks/bootstrap.png"

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
  frontend: [
    {
      value: "nextjs",
      label: "NextJS",
      icon: nextjs,
      supportsCss: true,
    },
    {
      value: "react",
      label: "React",
      icon: react,
      supportsCss: true,
    },
    {
      value: "vue",
      label: "Vue",
      icon: vue,
      supportsCss: true,
    },
    {
      value: "streamlit",
      label: "Streamlit",
      icon: streamlit,
      supportsCss: false,
    },
  ],
  css: [
    {
      value: "tailwind",
      label: "Tailwind",
      icon: tailwind,
    },
    {
      value: "bootstrap",
      label: "Bootstrap",
      icon: bootstrap,
    },
  ],
};
