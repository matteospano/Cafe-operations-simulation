# Café Operations Simulation

An interactive simulation of a small service business designed to model customer behavior, operational constraints, resource management, and decision-making in a dynamic environment.

Rather than implementing a traditional game loop, the project explores how a stateful system can represent real-world service operations: customers arrive according to schedules, place orders, engage in conversations, consume shared resources, leave feedback through satisfaction and tips, and react differently depending on their individual characteristics.

The simulation is intentionally built around interacting rules and state transitions, making it possible to experiment with how small operational decisions affect the overall performance of the café.

## Overview

The application simulates the daily operation of a café where the player acts as the owner and only barista.

The system continuously evaluates multiple independent elements:

- Customer schedules and arrivals
- Table and seat availability
- Order queues and preparation
- Customer patience and satisfaction
- Individual customer preferences
- Private and group conversations
- Friendship progression
- Tips and revenue
- Cleaning and resource availability
- Random daily events
- Operating costs and rent

The player must balance customer service, relationships, time, and limited resources while keeping the business financially sustainable.

The simulation is deterministic at the system level but contains controlled randomness in areas such as customer arrival times, customer decisions, and daily events, allowing different outcomes across runs.

## Core Concepts

### Stateful Simulation

The application maintains a centralized game state representing the current operational situation of the café.

State includes:

- Current day and time
- Customer schedules
- Customers currently in the café
- Table occupancy
- Active preparation tasks
- Active conversations
- Cleaning tasks
- Customer orders
- Friendship levels
- Satisfaction
- Revenue and expenses
- Daily events

Actions do not simply trigger visual changes. They modify the underlying state and can affect subsequent customer behavior and available actions.

### Customer Behavior Model

Customers are represented as data-driven entities rather than hard-coded characters.

Each customer can have:

- A recurring schedule
- A customer class
- Product preferences
- Patience
- Tip potential
- Friendship progression
- Individual characteristics affecting their behavior

Customer classes introduce different behavioral parameters.

For example, commuters may place a stronger emphasis on being served quickly, while other customer types may derive more value from personal or group conversations.

This makes the same action potentially valuable for one customer and inefficient for another.

### Time and Concurrent Activities

The simulation uses a virtual clock rather than real-time execution.

Actions consume simulated time and can affect independent activities simultaneously.

For example:

- A drink can be prepared while a conversation is taking place.
- A table can be cleaned while another customer is being served.
- Waiting advances the simulation until the next relevant event or task completion.

This creates operational trade-offs without requiring a real-time game loop.

### Data-Driven Configuration

Customer definitions, product information, classes, rules, prices, schedules, and other gameplay parameters are kept outside the core JavaScript logic.

This allows the behavior of the simulation to be modified without rewriting the underlying engine.

The data-driven approach also makes it possible to generate different customer populations and scenarios for replayability and experimentation.

## Key Features

### Customer Scheduling

Customers have recurring weekly schedules with configurable arrival windows.

Arrival times can vary slightly between days, preventing the simulation from becoming completely predictable while preserving recognizable customer patterns.

### Dynamic Customer Decisions

Customers can decide whether to place another order based on their characteristics and previous interactions.

Each customer has a maximum number of orders, preventing unlimited consumption and creating a natural lifecycle:

```
Arrival
  ↓
First order
  ↓
Service
  ↓
Conversation / interaction
  ↓
Possible second order
  ↓
Final interaction
  ↓
Departure
  ↓
Table becomes dirty
```

### Friendship Progression

Customer information is progressively revealed through interactions.

As the relationship develops, the system can reveal information such as:

- Name
- Surname
- Customer class
- Age
- Preferences
- Patience
- Tip characteristics
- Personal information

The customer identity displayed in the interface therefore evolves as the player gets to know them.

### Satisfaction and Tips

Customer satisfaction is influenced by multiple aspects of service rather than a single score.

Factors include:

- Serving time
- Conversations
- Customer preferences
- Customer class
- Interaction type

Tips provide a direct financial consequence to service quality and customer relationships.

### Resource Management

The player is constrained by the fact that they are the only barista.

Only one drink can be prepared at a time, one conversation can take place at a time, and one table can be cleaned at a time.

This creates a lightweight resource-allocation problem where the player must decide what should happen next.

### Table Lifecycle

Tables have an explicit operational lifecycle.

A seat can move through states such as:
```
Empty
  ↓
Occupied
  ↓
Customer leaves
  ↓
Empty and dirty
  ↓
Cleaning
  ↓
Empty
```

A dirty seat remains unavailable until the player performs the cleaning action.

This makes cleaning part of the operational workflow rather than a purely cosmetic interaction.

### Random Events

At the end of a day, the simulation can trigger configurable random events affecting the café's finances.

Examples include unexpected expenses or small positive discoveries.

Events are data-driven and can be tuned through their probability and financial impact.

This introduces controlled uncertainty into otherwise predictable operations.

### Financial Management

Revenue from customers is automatically collected when they leave.

The simulation also tracks operating costs, including the recurring monthly rent.

The player must therefore balance short-term customer service decisions with the longer-term financial sustainability of the business.

## Simulation Architecture

The application can be conceptually divided into four layers:

```
Configuration
     ↓
Simulation State
     ↓
Business Rules
     ↓
UI Rendering
```

### Configuration

JSON configuration defines the entities and parameters used by the simulation.

This includes:

- Customers
- Customer classes
- Products
- Prices
- Action durations
- Schedules
- Gameplay rules
- Random events
- Text shown to the player (<actions and logs)

The goal is to keep business parameters separate from the simulation engine.

### Simulation State

The JavaScript layer maintains the current state of the running simulation.

State transitions occur when the player performs an action or advances time.

### Business Rules

The simulation engine evaluates the consequences of actions.

Examples include:

Whether a customer can order
Whether a customer should leave
Whether a seat is available
How long an action takes
How satisfaction changes behaviours and tips
How tips are calculated
When a customer becomes impatient
Whether a second order is possible
When a table becomes available again
UI Rendering with no flickering or delayed actions

The interface reflects the current simulation state and available actions.

The UI is therefore primarily a representation of the simulation rather than the source of truth.

## Replayability

The simulation is designed to support different customer populations and configurations.

Customer generation can be used to create new scenarios from configurable parameters such as:

Available first names
Available surnames
Customer population size
Customer classes
Product preferences
Peak hours
Arrival density
Weekly schedules
Behavioral parameters

This allows the same simulation engine to operate against different datasets and scenarios.

### Example Customer Model

A customer can be represented using a compact, data-driven structure:
```json
{
  "id": "customer_001",
  "name": "Anna",
  "surname": "Bianchi",
  "class": 1,
  "age": 22,
  "likes": [1, 3],
  "patience": 88,
  "tip": 7
}
```

Behavioral characteristics are defined by the customer's class rather than being hard-coded into individual characters.

This makes it possible to introduce new customer types without changing the underlying simulation architecture.

## Technical Approach

The project focuses on several software engineering concepts:

State-driven application design
Data-driven business rules
Event-based simulation
Separation of configuration and logic
Resource and task management
Conditional state transitions
Deterministic time progression
Controlled randomness
Dynamic UI rendering
Modular JavaScript functions

The project deliberately keeps the simulation engine independent from the customer dataset and configurable parameters.

## Why This Project

The project started as an experiment in modeling a relatively simple real-world environment and progressively evolved into a more structured simulation of operational decision-making.

The café provides a compact domain where several common software engineering problems can be explored together:

Multiple entities interacting with shared resources
State transitions
Scheduling
Conditional business logic
User-driven workflows
Conflicting priorities
Configurable business rules
Data-driven behavior
Financial constraints
Random external events

The resulting system is less about the café itself and more about experimenting with how a set of business rules can be represented, executed, and exposed through an interactive interface.

## Getting Started

Clone the repository and open the project in a local development environment.

git clone https://github.com/matteospano/cafe-operations-simulation.git
cd cafe-operations-simulation/customer_simulation_v17

Run the project according to the included development setup.

## Potential Extensions

The current architecture provides a foundation for extending the simulation with additional operational scenarios.

### Possible extensions include:

Additional customer classes
More complex customer behavior
New products and preparation workflows
Supplier and inventory management
Employee management
Multiple café locations
Analytics and performance dashboards
Customer retention analysis
Scenario generation
Difficulty and scenario configuration (with advanced events)
Historical performance tracking
Professional Relevance

Although the simulation uses a café as its domain, the underlying concepts are applicable to many software and business environments.

The project demonstrates experience with:

Translating real-world processes into software rules
Modeling customer behavior
Working with configurable business logic
Designing stateful workflows
Managing competing resources
Building interactive operational interfaces
Separating domain configuration from application logic
Designing systems that can evolve without rewriting core logic

These are particularly relevant to applications involving customer workflows, operational systems, SaaS products, process automation, and solution-oriented engineering.

## License

This project is open source and available for educational and professional demonstration purposes.

## Contact

GitHub: @matteospano
