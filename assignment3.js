import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Cube, Axis_Arrows, Textured_Phong} = defs

export class basketBallScene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.ball_transform = Mat4.identity();
        this.vertVelocity = 10.61; //temp variable for projectile motion will delete in actual implementation
        this.shapes = {
            basketball: new defs.Subdivision_Sphere(5),
            cube : new Cube(),
            torus : new defs.Torus(10,10),
            //stands: new defs.Subdivision_Sphere(5), // adjust parameters as needed
            //roof: new defs.Cube(),
            //scorer: new defs.Cube(),
        }
        this.newRound = true; //tells whether this is new shot for player
        this.hoop_location = Mat4.identity().times(Mat4.translation(0,5.6,-11.7).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.materials = {
            phong: new Material(new Textured_Phong(), {
                color: hex_color("#CD5C5C"),
            }),
            texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0, specularity: 0.1,
                texture: new Texture("assets/b_texture.png"),
            }),
            court_texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/court.png")
            }),
            backboard_texture: new Material(new Textured_Phong(), {
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/Backboard.png")
            }),
            rim_texture: new Material(new Textured_Phong(), {
                color: hex_color("#FF5F15"),
            }),
            wall_texture: new Material(new Textured_Phong(), {
                color: hex_color("#C0C0C0"),
                ambient: 0.8, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/wall.png")
            }),

        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 0), vec3(0,5.6,-11.7), vec3(0, 10, 0));
    }
    //this function returns basketball's motion along its projectile path
    //TODO: make this function more general such as when it is not directly facing the net and wind
    basketball_thrown(initial_velocity,verticalAngle,horizontalAngle,vertical_velcity){
      //assume our mass of ball is 0.624 kg
      const gravity = 9.81; //force of gravity on ball
      
      const current_vertical_velocity = vertical_velcity - gravity*this.dt;//our vertical velocity is constantly changing
      //x direction not affected by gravity
      const horizontalPosition = initial_velocity*Math.cos(verticalAngle) * this.dt;
      const verticalPosition = current_vertical_velocity * this.dt;
      //with how we are currently set up, we are facing the net in the -z direction.
      this.ball_transform = this.ball_transform.times(Mat4.translation(horizontalPosition*Math.sin(horizontalAngle),verticalPosition,-1*horizontalPosition*Math.cos(horizontalAngle)));
      return current_vertical_velocity;
    }

    create_stadium(context, program_state, model_transform) {
        // existing court creation code...
    
    }
    round_setup(model_transform,program_state){
      let randomX = 0.0;
      let randomZ = 0.0;
      if(Math.random() < 0.5){ //50% of the time we move away
        randomX = -1.0 * Math.floor(Math.random() * 14.0);
        randomZ = -1.0 * Math.floor(Math.random() * 20.0);
      }
      else{
        randomX = Math.floor(Math.random() * 14.0);
        randomZ = Math.floor(Math.random() * 20.0);
      }
      this.ball_transform = model_transform.times(Mat4.translation(randomX,0,randomZ));
      this.newRound = false;
      //set our camera to ball's new location (work in progress as camera does not align perfectly yet)
      program_state.set_camera(Mat4.look_at(vec3(randomX, 3, randomZ +9), vec3(0,2.6,-11.7), vec3(0, 1, 0)));
    }

    create_court(context,program_state,model_transform){
        //create the court ground
        //current model_transform is uniform and cube we are using is a unit cube
        //1 unit counts as 1 meter (Subject to change)
        model_transform = model_transform.times(Mat4.translation(0,-1.5,0));
        let court_transform = model_transform.times(Mat4.scale(17,0.1,30));


        this.shapes.cube.draw(context,program_state,court_transform,this.materials.court_texture);

        //create the pole holding up the hoop
        let pole_transform = model_transform.times(Mat4.translation(0,3,-29))
            .times(Mat4.scale(0.40,3,0.4));
        this.shapes.cube.draw(context,program_state,pole_transform,this.materials.phong);

        let support_transform = model_transform.times(Mat4.translation(0,5.6,-28)).times(Mat4.scale(0.4,0.4,1));
        this.shapes.cube.draw(context,program_state,support_transform,this.materials.phong);

        let back_board_transform = model_transform.times(Mat4.translation(0,6,-27).times(Mat4.scale(1.8,1.2,0.1)));
        this.shapes.cube.draw(context,program_state,back_board_transform,this.materials.backboard_texture);
        let rim_transform = model_transform.times(Mat4.translation(0,5.15,-26).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.shapes.torus.draw(context,program_state,rim_transform,this.materials.rim_texture);


        //create the pole holding up the hoop
        let pole_transform_1 = model_transform.times(Mat4.translation(0,3,29))
        .times(Mat4.scale(0.40,3,0.4));
        this.shapes.cube.draw(context,program_state,pole_transform_1,this.materials.phong);

        let support_transform_1 = model_transform.times(Mat4.translation(0,5.6,28)).times(Mat4.scale(0.4,0.4,1));
        this.shapes.cube.draw(context,program_state,support_transform_1,this.materials.phong);

        let back_board_transform_1 = model_transform.times(Mat4.translation(0,6,27).times(Mat4.scale(1.8,1.2,0.1)));
        this.shapes.cube.draw(context,program_state,back_board_transform_1,this.materials.backboard_texture);
        let rim_transform_1 = model_transform.times(Mat4.translation(0,5.15,26).times(Mat4.scale(1,0.4,1).times(Mat4.rotation(3.14/2,1,0,0))));
        this.shapes.torus.draw(context,program_state,rim_transform_1,this.materials.rim_texture);


        // left side
        let left_transform = model_transform.times(Mat4.translation(-17,8,0)).times(Mat4.scale(0.1,8,30));
        this.shapes.cube.draw(context, program_state, left_transform, this.materials.wall_texture);

        // right side
        let right_transform = model_transform.times(Mat4.translation(17,8,0)).times(Mat4.scale(0.1,8,30));
        this.shapes.cube.draw(context, program_state, right_transform, this.materials.wall_texture);


        // front side1
        let front_transform = model_transform.times(Mat4.translation(0,8,-30)).times(Mat4.scale(17,8,0.1));
        this.shapes.cube.draw(context, program_state, front_transform, this.materials.wall_texture);
        

        // back side1
        let back_transform = model_transform.times(Mat4.translation(0,8,30)).times(Mat4.scale(17,8,0.1));
        this.shapes.cube.draw(context, program_state, back_transform, this.materials.wall_texture);
                



    }
    make_control_panel() {
        // TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
    }
    //this function is what gets done after a shot is made (i.e placing the basketball in random location)
    

    display(context, program_state) {
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, 0, -8));
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        const light_position = vec4(10, 10, 10, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        this.t = program_state.animation_time / 1000;
        this.dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        //randomize our basketball position (currently commented out to test basketball shooting)
        //if (this.newRound){
          //this.round_setup(model_transform,program_state);
          
        //}
        //for now we assume ball was thrown at 45 degrees from the vertical
        let angle = 0.78539; //radians
        
        
        if(this.t > 3.0){
          //basketball shot at 10 degrees to the right
          this.vertVelocity = this.basketball_thrown(15.0,angle,0.174,this.vertVelocity); //projectile motion function requires us to store current vert velocity
        }
        this.create_court(context,program_state,model_transform);
        //this.create_stadium(context, program_state, model_transform);
        this.shapes.basketball.draw(context, program_state, this.ball_transform.times(Mat4.scale(0.391,0.391,0.391)), this.materials.texture);
    }
}



